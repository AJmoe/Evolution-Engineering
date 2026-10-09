#!/bin/sh
# Starts MariaDB, creates and seeds the database, then runs Apache in the foreground.
set -e

# Apache reads ports.conf too; keep only our site's Listen line.
: > /etc/apache2/ports.conf

# Render gives the public URL; use it unless APP_URL was set explicitly.
if [ -z "$APP_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then
  export APP_URL="$RENDER_EXTERNAL_URL"
fi
if [ -z "$APP_SECRET" ]; then
  echo "APP_SECRET is not set; generating a temporary one." >&2
  export APP_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
fi

mkdir -p /run/mysqld && chown mysql:mysql /run/mysqld
if [ ! -d /var/lib/mysql/mysql ]; then
  mariadb-install-db --user=mysql --datadir=/var/lib/mysql >/dev/null
fi
mariadbd-safe --user=mysql >/dev/null 2>&1 &

i=0
until mariadb-admin ping --silent 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then echo "MariaDB did not start" >&2; exit 1; fi
  sleep 1
done

mariadb -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON *.* TO '$DB_USER'@'127.0.0.1';
GRANT ALL PRIVILEGES ON *.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

cd /var/www
php database/migrate.php --fresh --seed
chown -R www-data:www-data storage

exec apache2-foreground
