# Placeholders

Everything here is marked in code with `data-placeholder` or `TODO-CLIENT`. None may remain on the live site unless the client signs it off.

| Item | Where | Needed from the client |
|---|---|---|
| Logo | `public/images/brand/`, built from the supplied PNG | Optional: a vector (SVG or PDF) logo for sharper rendering |
| Project photography | `project_images` rows with paths starting `stock/`, shown with an "Illustrative photo" tag. Every project now has its own photo | Daylight photos of each project |
| Plant photography | `equipment.image_path` values starting `stock/`: every fleet item has an open-licence photo of the same make and model (the Hydromek A4 shows a similar backhoe loader) | Photos of the current fleet, and confirmation the list is current |
| Facility, service and supplies photos | About page, `ServiceCatalog` photo keys, `supplies.twig` | Photos of the client's own premises, work and stock |
| Interim photo credits | `/credits` page, `IMAGE_CREDITS.md` | None. Remove each credit when its photo is replaced; delete the page when none remain |
| Client logos | Homepage strip, `public/images/clients/`, sources in `IMAGE_CREDITS.md` | Logo files from each client, or permission to keep these |
| Home designs | `resources/js/home-designs.js` drives the 3D models, floor plans and blueprints (`npm run homes:drawings`, `npm run homes:stills`) | Final designs and the designer's drawings |
| Small homes FAQ answers | `templates/pages/small-homes.twig` (draft wording) | Clear with the client's lawyers |
| PPADB grades and period | About page | Current grades and registration period |
| PVC pipes | `supplies` table, `is_placeholder = 1` | Confirm PVC pipes are supplied |
| Privacy and terms wording | `templates/pages/privacy.twig`, `terms.twig` | Lawyer-approved wording |
| Map | `templates/partials/map.twig`, Google Maps search for Block 8 Industrial, loads on request | The exact pin of Plot 61047 (to fix later) |
