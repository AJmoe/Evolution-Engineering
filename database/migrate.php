<?php

declare(strict_types=1);

/**
 * Runs every SQL file in database/migrations once, in name order.
 * Usage: php database/migrate.php [--fresh] [--seed]
 */

require __DIR__ . '/../vendor/autoload.php';

use EvolutionEngineers\Support\Database;

Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

$args = array_slice($argv, 1);
$name = (string) ($_ENV['DB_NAME'] ?? 'evolution_engineers');
if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
    fwrite(STDERR, "DB_NAME may only contain letters, digits and underscores\n");
    exit(1);
}

$server = new PDO(
    sprintf('mysql:host=%s;port=%s;charset=utf8mb4', $_ENV['DB_HOST'] ?? '127.0.0.1', $_ENV['DB_PORT'] ?? '3306'),
    (string) ($_ENV['DB_USER'] ?? 'root'),
    (string) ($_ENV['DB_PASS'] ?? ''),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
if (in_array('--fresh', $args, true)) {
    $server->exec("DROP DATABASE IF EXISTS `$name`");
    echo "Dropped $name\n";
}
$server->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

$pdo = Database::connect($_ENV);
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS migrations (name VARCHAR(190) PRIMARY KEY, '
    . 'ran_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);
$done = $pdo->query('SELECT name FROM migrations')->fetchAll(PDO::FETCH_COLUMN);

$files = glob(__DIR__ . '/migrations/*.sql') ?: [];
sort($files);
foreach ($files as $file) {
    $base = basename($file);
    if (in_array($base, $done, true)) {
        continue;
    }
    $sql = preg_replace('/^--.*$/m', '', (string) file_get_contents($file)) ?? '';
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        $pdo->exec($statement);
    }
    $pdo->prepare('INSERT INTO migrations (name) VALUES (?)')->execute([$base]);
    echo "Migrated $base\n";
}

if (in_array('--seed', $args, true)) {
    require __DIR__ . '/seeds/seed.php';
    seed($pdo);
    echo "Seeded\n";
}
