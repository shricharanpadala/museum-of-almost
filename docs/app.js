import {exhibits,tours} from './data.js';
import {artwork} from './art.js';
import {filterExhibits,parseRoute,serializeRoute,readNotebook,persistNotebook,validateNotebook,emptyNotebook,toggleComparison,escapeHTML as esc} from './core.js';
const $=s=>document.querySelector(s);
const exhibitDialog=$('#exhibit-dialog'),compareDialog=$('#compare-dialog');
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('Unavailable');}};}
const loaded=readNotebook(storage);
let notebook=loaded.data,writable=loaded.writable,state=normalise(parseRoute(location.hash)),toastTimer,openedId=null;
function normalise(s){if(!['All',...exhibits.map(e=>e.category)].includes(s.category))s.category='All';if(!['All',...exhibits.map(e=>e.barrier)].includes(s.barrier))s.barrier='All';if(!tours.some(t=>t.id===s.tour))s.tour=null;return s;}
function toast(message){$('#toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').textContent='',4500);}
function showWarning(message){const el=$('#storage-warning');el.hidden=false;el.textContent=message;}
if(loaded.error)showWarning(loaded.error);
function save(){
 if(writable&&!persistNotebook(storage,notebook)){writable=false;showWarning('Browser storage is unavailable or full. Your changes are in memory only. Export your notebook before leaving.');}
 $('#saved-count').textContent=notebook.saved.length;
}
function navigate(changes,{replace=false,scroll=false}={}){
 state=normalise({...state,...changes});
 const next=serializeRoute(state);history[replace?'replaceState':'pushState'](null,'',location.pathname+location.search+next);
 render();if(scroll)$('#collection').scrollIntoView({behavior:'smooth'});
}
function cardActions(e){return `<div class="card-actions"><button data-compare="${e.id}" aria-pressed="${state.compare.includes(e.id)}" aria-label="${state.compare.includes(e.id)?'Remove':'Compare'} ${esc(e.title)}">${state.compare.includes(e.id)?'• Comparing':'+ Compare'}</button><button class="save-button" data-save="${e.id}" aria-pressed="${notebook.saved.includes(e.id)}" aria-label="${notebook.saved.includes(e.id)?'Unsave':'Save'} ${esc(e.title)}">${notebook.saved.includes(e.id)?'• Saved':'+ Save'}</button></div>`;}
function imageButton(e){return `<button class="card-art" style="--artifact-color:${e.color}" data-open="${e.id}" aria-label="Explore ${esc(e.title)}"><span class="accession">NO. ${e.number}</span>${artwork(e.art)}<span class="art-arrow" aria-hidden="true">›</span></button>`;}
function render(){
 $('#saved-count').textContent=notebook.saved.length;
 $('#search').value=state.query;$('#barrier').value=state.barrier;
 document.querySelectorAll('[data-room]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.room===state.category));
 document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.view===state.view));
 const tour=tours.find(t=>t.id===state.tour);
 let found=filterExhibits({...state,saved:state.view==='notebook'?notebook.saved:null,tour:tour?.ids});
 if(state.view==='timeline')found.sort((a,b)=>a.year-b.year);else if(tour)found.sort((a,b)=>tour.ids.indexOf(a.id)-tour.ids.indexOf(b.id));
 $('#result-count').textContent=`${String(found.length).padStart(2,'0')} / ${String(exhibits.length).padStart(2,'0')} exhibits${state.view==='notebook'?' · Your collection':''}`;
 $('#tour-banner').innerHTML=tour?`<div><span class="eyebrow">Guided walk · ${tour.ids.length} exhibits</span><br><strong>${esc(tour.title)}</strong></div><button data-action="exit-tour">Leave this walk ×</button>`:'';
 $('#notebook-tools').hidden=state.view!=='notebook';
 const grid=$('#exhibits');grid.className=state.view==='timeline'?'timeline-list':'exhibit-grid';
 grid.innerHTML=found.map(e=>state.view==='timeline'?`<article class="timeline-row"><span class="timeline-year">${e.year}</span>${imageButton(e)}<div><h3><button data-open="${e.id}">${esc(e.title)}</button></h3><p>${esc(e.subtitle)}</p></div>${cardActions(e)}</article>`:`<article class="exhibit-card">${imageButton(e)}<div class="card-meta"><span>${esc(e.category)}</span><span>${e.era}</span></div><h3><button data-open="${e.id}">${esc(e.title)}</button></h3><p>${esc(e.subtitle)}</p>${state.view==='notebook'&&notebook.notes[e.id]?`<div class="notebook-note">${esc(notebook.notes[e.id])}</div>`:''}${cardActions(e)}</article>`).join('');
 if(!found.length)grid.innerHTML=`<div class="empty-state"><h3>${state.view==='notebook'&&!notebook.saved.length?'A notebook waiting for its first idea.':'Nothing in this room. Yet.'}</h3><p>${state.view==='notebook'&&!notebook.saved.length?'Save an exhibit to collect it here. You can add your own notes inside each exhibit.':'Try a different search, or open the whole collection.'}</p><button data-action="reset" class="text-link">Explore all eight exhibits ›</button></div>`;
 const tray=$('#compare-tray');tray.hidden=!state.compare.length;
 tray.innerHTML=state.compare.length?`<span class="tray-names">${state.compare.length}/3 selected · ${state.compare.map(id=>esc(exhibits.find(e=>e.id===id).title)).join(' / ')}</span><button class="compare-go" data-action="compare" ${state.compare.length<2?'disabled':''}>Compare stories ›</button><button class="clear-compare" data-action="clear-compare" aria-label="Clear comparison">×</button>`:'';
 if(state.exhibit){if(openedId!==state.exhibit||!exhibitDialog.open)openExhibit(state.exhibit);}else if(exhibitDialog.open){const previous=openedId;exhibitDialog.close();openedId=null;document.querySelector(`[data-open="${previous}"]`)?.focus({preventScroll:true});}
 document.title=state.exhibit?`${exhibits.find(e=>e.id===state.exhibit).title} · Museum of Almost`:'Museum of Almost · Other possible futures';
}
function openExhibit(id){
 const e=exhibits.find(e=>e.id===id);if(!e)return;
 openedId=id;const sequence=tours.find(t=>t.id===state.tour)?.ids||exhibits.map(x=>x.id),index=sequence.indexOf(id),next=sequence[(index+1)%sequence.length],previous=sequence[(index-1+sequence.length)%sequence.length];
 exhibitDialog.innerHTML=`<div class="dialog-toolbar"><span>COLLECTION / ${e.number} OF 08</span><button data-action="close-exhibit" class="close-button">Back to the museum <span aria-hidden="true">×</span></button></div><div class="detail-header"><div class="detail-title"><p class="eyebrow">${esc(e.category)} · ${e.era}</p><h2 id="exhibit-title" tabindex="-1">${esc(e.title)}</h2><p class="subtitle">${esc(e.subtitle)}</p><span class="status">${esc(e.status)}</span></div><div class="detail-art" style="--artifact-color:${e.color}">${artwork(e.art)}<small>Interpretive illustration · Not to scale</small></div></div><div class="detail-body"><aside class="detail-facts"><dl><div><dt>Origin</dt><dd>${esc(e.place)}</dd></div><div><dt>People & organisations</dt><dd>${esc(e.maker)}</dd></div><div><dt>Curatorial lens</dt><dd>${esc(e.barrier)}</dd></div></dl><div class="button-row"><button data-save="${e.id}" aria-pressed="${notebook.saved.includes(e.id)}">${notebook.saved.includes(e.id)?'• Saved to notebook':'+ Save to notebook'}</button><button data-action="share-exhibit">Copy exhibit link ›</button><button data-compare="${e.id}" aria-pressed="${state.compare.includes(e.id)}">${state.compare.includes(e.id)?'• In comparison':'+ Add to comparison'}</button></div></aside><div class="detail-content"><p class="intro">${esc(e.intro)}</p><div class="chapter"><span>01</span><div><h3>The promise</h3><p>${esc(e.promise)}</p></div></div><div class="chapter"><span>02</span><div><h3>What happened</h3><p>${esc(e.history)}</p></div></div><div class="mini-timeline">${e.milestones.map(([year,text])=>`<div><strong>${year}</strong>${esc(text)}</div>`).join('')}</div><div class="chapter"><span>03</span><div><h3>What it leaves us</h3><p>${esc(e.legacy)}</p><p class="source-note">Curator’s reflection</p></div></div><section class="what-if"><p class="eyebrow">The counterfactual room · Interpretation</p><h3>${esc(e.question)}</h3><button data-action="hypothesis" aria-expanded="false" aria-controls="hypothesis-result">Change this one condition ›</button><div class="hypothesis" id="hypothesis-result" hidden><p>${esc(e.alternative)}</p><p class="remaining"><strong>What still needs solving:</strong> ${esc(e.remaining)}</p></div></section><section class="sources"><h3>Read the evidence</h3><p class="source-note">Historical account above; alternative outcomes are speculation. Sources reviewed 14 November 2026.</p>${e.sources.map(([label,url],i)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">0${i+1} · ${esc(label)} ›</a>`).join('')}</section><section class="note-area"><h3>What does this make you think of?</h3><label for="exhibit-note">Your private note</label><textarea id="exhibit-note" data-note="${e.id}" maxlength="6000" placeholder="A connection, a question, another possibility…">${esc(notebook.notes[e.id]||'')}</textarea><small id="note-status">${writable?'Saved on this device as you type.':'In memory only. Export before leaving.'} Notes are never included in shared links.</small></section></div></div><div class="exhibit-next"><button data-open="${previous}">← Previous exhibit</button><button data-open="${next}">Next exhibit →</button></div>`;
 if(!exhibitDialog.open)exhibitDialog.showModal();exhibitDialog.scrollTop=0;$('#exhibit-title').focus({preventScroll:true});
}
function showComparison(){
 const selected=state.compare.map(id=>exhibits.find(e=>e.id===id));if(selected.length<2)return;
 const rows=[['Moment',e=>e.era],['Outcome',e=>e.status],['Promise',e=>e.promise],['What happened',e=>e.history],['Curatorial lens',e=>e.barrier],['Change one thing',e=>e.question],['Still unresolved',e=>e.remaining]];
 compareDialog.innerHTML=`<div class="dialog-toolbar"><span>THE COMPARISON ROOM</span><button data-action="close-compare" class="close-button">Close <span>×</span></button></div><div class="comparison"><p class="eyebrow">Look for the differences</p><h2 id="compare-title" tabindex="-1">Same word. Different almosts.</h2><p>The obstacle labels are a curatorial lens, not a complete explanation of each history.</p><div class="comparison-table" role="region" aria-label="Exhibit comparison" tabindex="0"><table><thead><tr><th scope="col">Exhibit</th>${selected.map(e=>`<th scope="col"><div class="small-art" style="--artifact-color:${e.color}">${artwork(e.art)}</div>${esc(e.title)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>`<tr><th scope="row">${label}</th>${selected.map(e=>`<td>${esc(get(e))}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Evidence</th>${selected.map(e=>`<td><button class="text-link" data-open="${e.id}">Open exhibit & sources ›</button></td>`).join('')}</tr></tbody></table></div><div class="button-row"><button data-action="share-comparison">Copy comparison link ›</button></div></div>`;
 compareDialog.showModal();$('#compare-title').focus({preventScroll:true});
}
async function copyLink(comparison=false){
 const shared=comparison?{...state,exhibit:null,view:'gallery'}:{...state,view:'gallery',query:'',category:'All',barrier:'All',compare:[]};
 const link=location.origin+location.pathname+serializeRoute(shared);
 try{await navigator.clipboard.writeText(link);toast('Link copied. Your notes stay private.');}catch{toast('Clipboard unavailable. You can copy the address from your browser.');}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.open){if(compareDialog.open)compareDialog.close();navigate({exhibit:button.dataset.open});return;}
 if(button.dataset.room){navigate({category:button.dataset.room});return;}
 if(button.dataset.save){const id=button.dataset.save;if(notebook.saved.includes(id))notebook.saved=notebook.saved.filter(x=>x!==id);else notebook.saved.push(id);save();render();if(exhibitDialog.open){const b=exhibitDialog.querySelector('[data-save]');b.textContent=notebook.saved.includes(id)?'• Saved to notebook':'+ Save to notebook';b.setAttribute('aria-pressed',notebook.saved.includes(id));}return;}
 if(button.dataset.compare){const before=state.compare;const next=toggleComparison(before,button.dataset.compare);if(next===before&&before.length===3){toast('Compare up to three exhibits. Remove one to add another.');return;}navigate({compare:next});if(exhibitDialog.open){const b=exhibitDialog.querySelector('[data-compare]');b.textContent=next.includes(button.dataset.compare)?'• In comparison':'+ Add to comparison';b.setAttribute('aria-pressed',next.includes(button.dataset.compare));}return;}
 if(button.dataset.tour){navigate({tour:button.dataset.tour,query:'',category:'All',barrier:'All',view:'gallery'},{scroll:true});return;}
 switch(button.dataset.action){
 case 'view':navigate({view:button.dataset.view},{scroll:true});break;
 case 'exit-tour':navigate({tour:null});break;
 case 'reset':navigate({view:'gallery',tour:null,query:'',category:'All',barrier:'All'});break;
 case 'close-exhibit':navigate({exhibit:null});break;
 case 'hypothesis':{const result=$('#hypothesis-result');result.hidden=!result.hidden;button.setAttribute('aria-expanded',!result.hidden);button.textContent=result.hidden?'Change this one condition ›':'Return to the question ‹';break;}
 case 'compare':showComparison();break;
 case 'close-compare':compareDialog.close();break;
 case 'clear-compare':navigate({compare:[]});break;
 case 'share-exhibit':copyLink();break;
 case 'share-comparison':copyLink(true);break;
 case 'export':{const blob=new Blob([JSON.stringify(notebook,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='museum-of-almost-notebook.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Notebook exported. Keep it somewhere safe.');break;}
 }
});
$('#search').addEventListener('input',e=>navigate({query:e.target.value},{replace:true}));
$('#barrier').addEventListener('change',e=>navigate({barrier:e.target.value}));
document.addEventListener('input',event=>{if(!event.target.dataset.note)return;const id=event.target.dataset.note;notebook.notes[id]=event.target.value;if(!notebook.saved.includes(id))notebook.saved.push(id);save();$('#note-status').textContent=writable?'Saved on this device. Notes are never included in shared links.':'In memory only. Export your notebook before leaving.';const b=exhibitDialog.querySelector('[data-save]');b.textContent='• Saved to notebook';b.setAttribute('aria-pressed','true');});
$('#import-file').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{
 if(file.size>100000)throw Error('Choose a notebook smaller than 100 KB.');
 const incoming=validateNotebook(JSON.parse(await file.text()));
 const notes={...notebook.notes};for(const [id,note] of Object.entries(incoming.notes)){if(note&&notes[id]&&notes[id]!==note)notes[id]+='\n\n[Imported note]\n'+note;else if(note)notes[id]=note;}
 const merged=validateNotebook({version:1,saved:[...notebook.saved,...incoming.saved],notes});notebook=merged;save();render();toast('Notebook imported. Existing notes were kept.');
 }catch(error){toast(error instanceof SyntaxError?'This file is not valid JSON. Your notebook was not changed.':error.message);}finally{event.target.value='';}});
exhibitDialog.addEventListener('cancel',e=>{e.preventDefault();navigate({exhibit:null});});
exhibitDialog.addEventListener('click',e=>{if(e.target===exhibitDialog){const r=exhibitDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)navigate({exhibit:null});}});
compareDialog.addEventListener('click',e=>{if(e.target===compareDialog){const r=compareDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)compareDialog.close();}});
window.addEventListener('popstate',()=>{if(compareDialog.open)compareDialog.close();state=normalise(parseRoute(location.hash));render();});
window.addEventListener('hashchange',()=>{state=normalise(parseRoute(location.hash));render();});
window.addEventListener('storage',e=>{if(e.key!=='museum-of-almost:v1')return;const fresh=readNotebook(storage);if(fresh.writable){notebook=fresh.data;render();if(exhibitDialog.open){const note=$('#exhibit-note');if(document.activeElement!==note)note.value=notebook.notes[state.exhibit]||'';}}else{writable=false;showWarning(fresh.error);}});
$('#hero-art').innerHTML=artwork('plane');
$('#rooms').innerHTML=['All',...new Set(exhibits.map(e=>e.category))].map(room=>`<button data-room="${esc(room)}" aria-pressed="false">${room==='All'?'All exhibits':esc(room)}</button>`).join('');
$('#barrier').insertAdjacentHTML('beforeend',[...new Set(exhibits.map(e=>e.barrier))].sort().map(b=>`<option>${esc(b)}</option>`).join(''));
$('#tours').innerHTML=tours.map((t,i)=>`<button class="tour-entry" data-tour="${t.id}"><span class="tour-no">0${i+1}</span><span><strong>${esc(t.title)}</strong><small>${esc(t.description)}</small></span><span aria-hidden="true">›</span></button>`).join('');
render();

if(state.compare.length>=2&&!state.exhibit)showComparison();
