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
