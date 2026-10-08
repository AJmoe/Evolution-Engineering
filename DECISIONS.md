# Decisions

Non-obvious decisions, newest last.

## 2026-10-07: Phase 1 and 2 foundation

- **Stack as briefed.** Slim 4 with PHP-DI, Twig 3, PDO on MySQL/MariaDB, PHPMailer, phpdotenv, Monolog, Vite.
- **PHP version.** Production and Docker use PHP 8.3. `composer.json` allows 8.2 so the code also runs on the developer's local PHP 8.2; no 8.3-only syntax is used.
- **Stateless CSRF.** The public site sets no cookies, as the brief requires. CSRF uses a signed, time-stamped token in a hidden field instead of a session. The token's timestamp also gives the minimum fill-time spam check (3 seconds). Tokens expire after two hours.
- **Spam handling.** Honeypot hits and too-fast submissions get the normal success page, so bots learn nothing. Rate limit is 5 enquiries per hashed IP per hour, counted from the database.
- **IP hashing.** IPs are stored as an HMAC with `APP_SECRET`, so they cannot be reversed by brute force over the IPv4 space without the secret.
- **Whole stylesheet inlined.** The built CSS is about 23 KB, or 5.5 KB gzipped. Inlining all of it removes the render-blocking request and keeps CSP simple. Revisit if CSS grows past about 14 KB gzipped.
- **Fonts.** Latin subsets of Fraunces 300/400 and Hanken Grotesk 400/500/600 are copied from Fontsource into `resources/fonts` and bundled by Vite. Total 77 KB, under the 120 KB budget. The two most-used files are preloaded.
- **Projects filter.** The server renders every project and hides non-matching ones with the `hidden` attribute, so filter links work without JavaScript and JavaScript can filter instantly without a second request.
- **All 24 projects seeded.** The brief says "six real projects" in one place but the Content deck lists 24. All 24 are real and are seeded; the three named in the deck are featured.
- **Contract values.** Stored in `value_pula` and hidden unless `show_value` is set per project. Repositories null the value when hidden so templates cannot leak it.
- **Placeholder imagery.** Until photography arrives, projects, plant and homes use blueprint-style inline SVG drawings marked `data-placeholder`. The hero uses an SVG daylight still until the 3D poster is rendered in phase 3.
- **HTML page cache deferred.** On-disk HTML caching with admin-save invalidation lands with the admin in phase 4, because the contact page carries a per-request CSRF token and must stay uncached.

## 2026-10-07: Phase 3, 3D hero and homes viewer

- **No prototype on hand.** The scene was built from the brief's description, because `evolution-engineers-sample-v2.html` was not supplied. Its listed techniques are all used: clipping-plane facade reveal, `InstancedMesh` for trees, cars and lamps, `LineSegments` with `setDrawRange` for the site plan, `depthWrite: false` on transparent lines, layers at least 0.02 m apart, near plane at 2, and a canvas facade texture with per-face repeats.
- **Three.js r186, pinned.** Light intensities were re-tuned for physical light units. `PCFSoftShadowMap` was removed upstream, so shadows use `PCFShadowMap` with a blur radius. Tone mapping is `NeutralToneMapping`, which keeps the brand blue and orange true.
- **Sky in the scene, not in CSS.** A vertex-coloured sky dome whose horizon matches the fog colour, so distant ground melts into the sky and the pre-rendered stills match live frames exactly.
- **Glass.** A metalness and roughness map from the facade canvas makes glass reflect the sky environment while spandrels stay matte.
- **Layout via view offset.** On desktop the camera's view offset shifts the building right of frame, leaving the left five columns for text. On phones the canvas fills the top 55% and the camera pulls back by aspect ratio.
- **Frame-time step-down.** Only consecutive rendered frames are measured, after ten warm-up frames, because the scene renders on demand rather than continuously.
- **Stills and social image are generated.** `npm run stills` renders the three stage stills (desktop and phone), the poster and `og-default.png` from the live scene in headless Edge. They are never hand-edited.
- **Homes viewer.** Procedural models for gable, L-shaped and courtyard types, driven by `model_params`. The `.glb` path (phase 2 of model sourcing) is still to add when the client supplies models.
- **Bundle.** Three.js and the shared helpers form one lazy chunk of about 143 KB gzipped. The hero scene adds about 5 KB and the homes viewer about 4 KB. Neither loads on the stills tier or with reduced motion.

## 2026-10-08: Ideas adapted from a reference site (Buildnox theme)

Adopted, in the light design and with facts from the Content deck only:

- **Outlined display band.** "Civil · Mechanical · Electrical" in outlined Fraunces above the services list. Static, `aria-hidden`, falls back to `--mist` text where text-stroke is unsupported.
- **Line icons on service rows,** in `--brand-deep`, not orange, to keep orange to three uses per screen.
- **Overlapping "why" card.** The clients and registrations section now leads with a white card that overlaps the section above. It holds five checklist points from the Content deck and a large "call the office" number.
- **Drawing-board column lines** behind inner page headers and the footer, aligned to a six-column split of the content width.
- **Footer contact strip** with address, tenders email and phone above the footer columns.

Not adopted, because they conflict with the brief:

- Skill percentage bars ("Construction 96%"), which would be invented facts.
- Service and testimonial carousels; the brief bans carousels. Testimonials would also need real, approved quotes.
- Dark hero and full-bleed dark sections, stock photos of workers in hard hats, and orange eyebrow labels above every heading.
- Newsletter sign-up and social icons; the client has no newsletter or confirmed social accounts.
- Client logo strip; logos need the client's permission (open question).

Deviation to confirm with the client: section 5 of the homepage is now headed "Why procurement teams shortlist us" rather than a plain clients list. The content is the same facts plus the phone number.
