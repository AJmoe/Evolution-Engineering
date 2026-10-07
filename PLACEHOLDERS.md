# Placeholders

Everything here is marked in code with `data-placeholder` or `TODO-CLIENT`. None may remain on the live site unless the client signs it off.

| Item | Where | Needed from the client |
|---|---|---|
| Logo | `templates/components/macros.twig`, macro `brand` | `evolution-engineers-logo-clean.png`, plus vector and white reversed versions |
| Email addresses | `settings` table (`emails_are_placeholders = 1`) | Confirm the domain and create info@, tenders@ and homes@ |
| Fax number | `settings.fax` is empty, so hidden | Is 392 3086 still in use? |
| Hero poster | `templates/partials/hero-art.twig` | None. Replaced by the rendered 3D poster in phase 3 |
| Project photography | macro `drawing` on cards and project pages | Daylight photos, and permission to show named clients |
| Plant photography | macro `machine` | Photos of the current fleet, and confirmation the list is current |
| Facility photo | About page | Photo of the Block 8 premises |
| Home designs and floor plans | `homes` table, macros `home_poster` and `floorplan` | Final designs and the designer's SVG plans |
| Small homes FAQ answers | `templates/pages/small-homes.twig` | Inclusions, changes, build times, approvals |
| How we work copy | `templates/pages/home.twig`, section 7 | Confirm the four steps |
| PPADB grades and period | About page | Current grades and registration period |
| PVC pipes | `supplies` table, `is_placeholder = 1` | Confirm PVC pipes are supplied |
| Privacy and terms wording | `templates/pages/privacy.twig`, `terms.twig` | Lawyer-approved wording |
| Open Graph image | `templates/layout.twig` | None. Produced from the hero render in phase 3 |
| Static map | Contact page | None. Replace with a rendered map image before launch |
