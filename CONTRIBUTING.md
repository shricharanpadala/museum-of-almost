# Contributing an exhibit

Open an issue with the proposed object, its dates, what happened and at least two useful sources. Prefer original records, museum collections, institutional archives and research. Separate evidence from interpretation. Avoid calling a continuing project dead or an operating product a prototype.

An exhibit in `docs/data.js` needs a stable ID, a unique accession number, chronological year, display era, category, outcome, maker, location, promise, historical account, reflection, two dated milestones and source links. Its counterfactual needs a question, a cautious alternative and an unresolved constraint. Add an original illustration in `docs/art.js`; do not copy photographs without permission and appropriate attribution.

Collection counters and room filters derive from the data. Update the static metadata and catalogue coverage test when expanding the collection. Check filters, tours, shared links, comparison, narrow screens and keyboard navigation. Run `npm run check` and `npm test` before opening a pull request.

Never commit visitor notebooks, personal credentials or employer material. The repository currently has no open-source licence; discuss proposed code reuse with the owner.
