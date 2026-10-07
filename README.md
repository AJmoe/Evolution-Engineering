# Evolution Engineers website

Server-rendered PHP site (Slim 4, Twig 3, MySQL/MariaDB) with a Vite front-end build.
The developer brief is the single source of truth for scope, design and acceptance.

## Run locally with Docker

```sh
cp .env.example .env            # then set APP_SECRET to a long random string
npm ci && npm run build
docker compose up
```

Site: http://localhost:8080. Caught mail: http://localhost:8025.

## Run locally without Docker

Needs PHP 8.2+ with pdo_mysql, intl and mbstring, Node 20+, and a local MySQL or MariaDB.

```sh
cp .env.example .env            # set APP_SECRET and DB_* values
composer install
npm ci && npm run build
php database/migrate.php --fresh --seed
php -S 127.0.0.1:8080 -t public public/index.php
```

For live CSS and JS reloading, run `npm run dev` and set `VITE_DEV_SERVER=http://localhost:5173` in `.env`.

## Checks

```sh
vendor/bin/phpunit                 # unit tests
vendor/bin/phpstan analyse         # static analysis, level 6
vendor/bin/phpcs                   # PSR-12
node tools/screenshots.mjs         # screenshots, console errors and overflow at desktop and phone widths
```

## Where things are

| Path | What it holds |
|---|---|
| `src/Support/Bootstrap.php` | Container, middleware and routes |
| `src/Controller` | One controller per area; no SQL |
| `src/Repository` | PDO repositories |
| `src/Service` | Enquiry validation, routing and mail |
| `src/Domain/ServiceCatalog.php` | Service scope copy, taken from the company profile |
| `templates/` | Twig layout, pages, partials and macros |
| `resources/css/main.css` | Design tokens and components |
| `database/` | Migrations and seed data from the Content deck |

## Project records

- `DECISIONS.md` records non-obvious decisions.
- `PLACEHOLDERS.md` lists every placeholder and `TODO-CLIENT` item.
- `OPEN_QUESTIONS.md` lists questions for the client.
- `LICENSES.md` lists third-party licences.
