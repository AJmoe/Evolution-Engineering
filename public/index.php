<?php

declare(strict_types=1);

// Let the PHP built-in server serve real files (assets, images) directly.
if (PHP_SAPI === 'cli-server') {
    $file = __DIR__ . parse_url((string) $_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (is_file($file) && !str_ends_with($file, '.php')) {
        return false;
    }
}

require dirname(__DIR__) . '/vendor/autoload.php';

EvolutionEngineers\Support\Bootstrap::createApp(dirname(__DIR__))->run();
