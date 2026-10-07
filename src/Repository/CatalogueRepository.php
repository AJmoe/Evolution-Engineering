<?php

declare(strict_types=1);

namespace EvolutionEngineers\Repository;

use PDO;

/**
 * Read access to equipment, supplies and site settings.
 */
final class CatalogueRepository
{
    public const EQUIPMENT_GROUPS = [
        'earthmoving' => 'Earthmoving',
        'compaction' => 'Compaction',
        'haulage' => 'Haulage',
        'vehicles' => 'Site and survey vehicles',
    ];

    public const SUPPLY_CATEGORIES = [
        'valves' => 'Valves',
        'pipes' => 'Pipes',
        'electric_motors' => 'Electric motors',
    ];

    /** @var array<string, string>|null */
    private ?array $settings = null;

    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return array<string, array{label: string, items: list<array<string, mixed>>}>
     */
    public function equipmentByGroup(): array
    {
        $rows = $this->pdo->query(
            'SELECT * FROM equipment WHERE published = 1 AND deleted_at IS NULL ORDER BY sort ASC'
        )->fetchAll();
        $groups = [];
        foreach (self::EQUIPMENT_GROUPS as $key => $label) {
            $groups[$key] = ['label' => $label, 'items' => []];
        }
        foreach ($rows as $row) {
            $groups[$row['group_name']]['items'][] = $row;
        }

        return array_filter($groups, static fn (array $g): bool => $g['items'] !== []);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function equipmentHighlights(int $limit = 8): array
    {
        return $this->pdo->query(
            'SELECT * FROM equipment WHERE published = 1 AND deleted_at IS NULL AND group_name <> \'vehicles\'
             ORDER BY sort ASC LIMIT ' . max(1, $limit)
        )->fetchAll();
    }

    /**
     * @return array<string, array{label: string, items: list<array<string, mixed>>}>
     */
    public function suppliesByCategory(): array
    {
        $rows = $this->pdo->query(
            'SELECT * FROM supplies WHERE published = 1 AND deleted_at IS NULL ORDER BY sort ASC'
        )->fetchAll();
        $groups = [];
        foreach (self::SUPPLY_CATEGORIES as $key => $label) {
            $groups[$key] = ['label' => $label, 'items' => []];
        }
        foreach ($rows as $row) {
            $groups[$row['category']]['items'][] = $row;
        }

        return array_filter($groups, static fn (array $g): bool => $g['items'] !== []);
    }

    /**
     * @return array<string, string>
     */
    public function settings(): array
    {
        if ($this->settings === null) {
            $this->settings = [];
            foreach ($this->pdo->query('SELECT `key`, `value` FROM settings')->fetchAll() as $row) {
                $this->settings[(string) $row['key']] = (string) $row['value'];
            }
        }

        return $this->settings;
    }
}
