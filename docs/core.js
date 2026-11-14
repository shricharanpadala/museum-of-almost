import {exhibits} from './data.js';
export const ids = new Set(exhibits.map(e=>e.id));
export const emptyNotebook = () => ({version:1,saved:[],notes:{}});
export function validateNotebook(value) {
 if (!value || value.version!==1 || !Array.isArray(value.saved) || !value.notes || typeof value.notes!=='object' || Array.isArray(value.notes)) throw new Error('This is not a supported museum notebook.');
 if (value.saved.some(id=>typeof id!=='string'||!ids.has(id))) throw new Error('The notebook contains an unknown exhibit.');
 const notes={};
 for (const [id,note] of Object.entries(value.notes)) {
  if (!ids.has(id)||typeof note!=='string'||note.length>6000) throw new Error('A note is invalid or exceeds 6,000 characters.');
  notes[id]=note;
 }
 return {version:1,saved:[...new Set(value.saved)],notes};
}
export function readNotebook(storage) {
 try {const raw=storage.getItem('museum-of-almost:v1');return {data:raw?validateNotebook(JSON.parse(raw)):emptyNotebook(),writable:true,error:null};}
 catch {return {data:emptyNotebook(),writable:false,error:'Your saved notebook could not be read. It has been left untouched. Export any new notes before leaving.'};}
}
export function persistNotebook(storage,data) {try {storage.setItem('museum-of-almost:v1',JSON.stringify(validateNotebook(data)));return true;}catch{return false;}}
export function filterExhibits({query='',category='All',barrier='All',saved=null,tour=null}={}) {
 const q=query.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 return exhibits.filter(e=>(category==='All'||e.category===category)&&(barrier==='All'||e.barrier===barrier)&&(!saved||saved.includes(e.id))&&(!tour||tour.includes(e.id))&&(!q||[e.title,e.subtitle,e.maker,e.place,e.year,e.intro].join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)));
}
export function parseRoute(hash) {
 const p=new URLSearchParams(hash.replace(/^#/,''));
 return {exhibit:ids.has(p.get('exhibit'))?p.get('exhibit'):null,view:['gallery','timeline','notebook'].includes(p.get('view'))?p.get('view'):'gallery',query:(p.get('q')||'').slice(0,150),category:p.get('room')||'All',barrier:p.get('barrier')||'All',tour:p.get('tour')||null,compare:[...new Set((p.get('compare')||'').split(',').filter(id=>ids.has(id)))].slice(0,3)};
}
export function serializeRoute(state) {
 const p=new URLSearchParams();
 for(const [key,value] of Object.entries({view:state.view!=='gallery'?state.view:null,q:state.query,room:state.category!=='All'?state.category:null,barrier:state.barrier!=='All'?state.barrier:null,tour:state.tour,exhibit:state.exhibit,compare:state.compare?.join(',')})) if(value)p.set(key,value);
 return p.size?'#'+p.toString():'';
}
export function toggleComparison(current,id) {
 if(!ids.has(id))return current;
 if(current.includes(id))return current.filter(x=>x!==id);
 return current.length<3?[...current,id]:current;
}
export const escapeHTML = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
