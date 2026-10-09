# Placeholders

Everything here is marked in code with `data-placeholder` or `TODO-CLIENT`. None may remain on the live site unless the client signs it off.

| Item | Where | Needed from the client |
|---|---|---|
| Logo | `public/images/brand/`, built from the supplied PNG | A vector (SVG or PDF) logo for sharper rendering |
| Email addresses | `settings` table (`emails_are_placeholders = 1`) | info@evolutionengineers.co.bw is confirmed by the business cards; confirm tenders@ and homes@ exist |
| Fax number | `settings.fax` is empty, so hidden | Is 392 3086 still in use? |
| Project photography | `project_images` rows with paths starting `stock/`, shown with an "Illustrative photo" tag; projects without one show a drawing | Daylight photos of each project, and permission to show named clients |
| Plant photography | `equipment.image_path` values starting `stock/` (same machine type, not their units); others show a drawing | Photos of the current fleet, and confirmation the list is current |
| Facility photo | About page, interim workshop photo | Photo of the Block 8 premises |
| Service and supplies photos | `ServiceCatalog` photo keys and `supplies.twig` | Photos of the client's own work, workshop and stock |
| Interim photo credits | `/credits` page, `IMAGE_CREDITS.md` | None. Remove each credit when its photo is replaced; delete the page when none remain |
| Home designs and floor plans | `homes` table, `resources/js/homes-viewer.js`, macros `home_poster` and `floorplan` | Final designs, the designer's SVG plans, and optionally a `.glb` model per design |
| Small homes FAQ answers | `templates/pages/small-homes.twig` | Inclusions, changes, build times, approvals |
| How we work copy | `templates/pages/home.twig`, section 7 | Confirm the four steps |
| PPADB grades and period | About page | Current grades and registration period |
| PVC pipes | `supplies` table, `is_placeholder = 1` | Confirm PVC pipes are supplied |
| Privacy and terms wording | `templates/pages/privacy.twig`, `terms.twig` | Lawyer-approved wording |
| Director photo | Homepage and About, initials "TD" shown instead | A portrait of Trinity Dialwa, if wanted |
| Map | `templates/partials/map.twig`, Google Maps search for Block 8 Industrial | The exact pin or coordinates of Plot 61047 |
