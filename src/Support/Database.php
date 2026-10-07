<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

use PDO;

final class Database
{
    /**
     * @param array<string, mixed> $env
     */
    public static function connect(array $env): PDO
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $env['DB_HOST'] ?? '127.0.0.1',
            $env['DB_PORT'] ?? '3306',
            $env['DB_NAME'] ?? 'evolution_engineers'
        );

        return new PDO($dsn, (string) ($env['DB_USER'] ?? 'root'), (string) ($env['DB_PASS'] ?? ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
