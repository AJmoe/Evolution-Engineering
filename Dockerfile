# Single-container image for temporary hosting on Render (see docs in README, "Deploy to Render").
# Apache + PHP 8.3 serve the site; MariaDB runs in the same container and is re-seeded on every start,
# so enquiries do not survive a restart. Local development still uses docker-compose.yml.

# 1. Front-end build
FROM node:22-bookworm-slim AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.js ./
COPY resources ./resources
RUN npm run build

# 2. PHP dependencies
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader --ignore-platform-reqs --no-scripts

# 3. Runtime
FROM php:8.3-apache-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends mariadb-server libicu-dev \
    && docker-php-ext-install pdo_mysql intl opcache \
    && apt-get purge -y libicu-dev && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite headers expires deflate \
    && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/render/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/render/mariadb.cnf /etc/mysql/mariadb.conf.d/99-render.cnf
COPY docker/render/start.sh /usr/local/bin/start-site

WORKDIR /var/www
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/assets ./public/assets

RUN chmod +x /usr/local/bin/start-site \
    && mkdir -p storage/logs storage/cache/twig storage/uploads \
    && chown -R www-data:www-data storage

ENV APP_ENV=production APP_DEBUG=false APP_NOINDEX=true \
    DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=evolution_engineers DB_USER=ee DB_PASS=ee \
    PORT=10000 TRUST_PROXY=true
EXPOSE 10000
CMD ["start-site"]
