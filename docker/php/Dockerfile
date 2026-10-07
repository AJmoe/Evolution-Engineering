FROM php:8.3-fpm-alpine

RUN apk add --no-cache icu-dev libzip-dev \
    && docker-php-ext-install pdo_mysql intl opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
