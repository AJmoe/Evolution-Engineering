<?php

declare(strict_types=1);

namespace EvolutionEngineers\Repository;

use PDO;

final class HomeRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function published(): array
    {
        $rows = $this->pdo->query(
            'SELECT * FROM homes WHERE status = \'published\' AND deleted_at IS NULL ORDER BY sort ASC'
        )->fetchAll();

        return array_map([$this, 'hydrate'], $rows);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM homes WHERE slug = ? AND status = \'published\' AND deleted_at IS NULL'
        );
        $stmt->execute([$slug]);
        $row = $stmt->fetch();

        return $row ? $this->hydrate($row) : null;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydrate(array $row): array
    {
        $row['features'] = json_decode((string) ($row['features'] ?? '[]'), true) ?: [];
        $row['model_params'] = json_decode((string) ($row['model_params'] ?? '{}'), true) ?: [];
        $row['area_m2'] = rtrim(rtrim((string) $row['area_m2'], '0'), '.');
        $row['is_placeholder'] = (bool) $row['is_placeholder'];
        if (!(bool) $row['show_price']) {
            $row['price_from'] = null;
        }

        return $row;
    }
}
