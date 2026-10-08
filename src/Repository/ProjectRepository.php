<?php

declare(strict_types=1);

namespace EvolutionEngineers\Repository;

use PDO;

final class ProjectRepository
{
    public const CATEGORIES = [
        'roads' => 'Roads',
        'design_build' => 'Design and build',
        'civil_building' => 'Civil and building',
        'water_sewerage' => 'Water and sewerage',
        'mechanical' => 'Mechanical',
    ];

    /** Each project with its first image, if any. */
    private const SELECT = 'SELECT p.*,
        (SELECT i.path FROM project_images i WHERE i.project_id = p.id ORDER BY i.sort LIMIT 1) AS photo_path,
        (SELECT i.alt FROM project_images i WHERE i.project_id = p.id ORDER BY i.sort LIMIT 1) AS photo_alt
        FROM projects p';

    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function published(?string $category = null, ?int $year = null): array
    {
        $sql = self::SELECT . ' WHERE status = \'published\' AND deleted_at IS NULL';
        $params = [];
        if ($category !== null) {
            $sql .= ' AND category = ?';
            $params[] = $category;
        }
        if ($year !== null) {
            $sql .= ' AND year = ?';
            $params[] = $year;
        }
        $sql .= ' ORDER BY (year IS NULL) DESC, year DESC, sort ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'hydrate'], $stmt->fetchAll());
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function featured(int $limit = 3): array
    {
        $stmt = $this->pdo->prepare(
            self::SELECT . ' WHERE status = \'published\' AND deleted_at IS NULL AND featured = 1
             ORDER BY sort ASC LIMIT ' . max(1, $limit)
        );
        $stmt->execute();

        return array_map([$this, 'hydrate'], $stmt->fetchAll());
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->pdo->prepare(
            self::SELECT . ' WHERE slug = ? AND status = \'published\' AND deleted_at IS NULL'
        );
        $stmt->execute([$slug]);
        $row = $stmt->fetch();

        return $row ? $this->hydrate($row) : null;
    }

    /**
     * @param list<string> $categories
     * @return list<array<string, mixed>>
     */
    public function byCategories(array $categories, int $limit, ?string $excludeSlug = null): array
    {
        if ($categories === []) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($categories), '?'));
        $params = $categories;
        $sql = self::SELECT . " WHERE status = 'published' AND deleted_at IS NULL AND category IN ($marks)";
        if ($excludeSlug !== null) {
            $sql .= ' AND slug <> ?';
            $params[] = $excludeSlug;
        }
        $sql .= ' ORDER BY featured DESC, year DESC LIMIT ' . max(1, $limit);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'hydrate'], $stmt->fetchAll());
    }

    /**
     * @return list<int>
     */
    public function years(): array
    {
        $rows = $this->pdo->query(
            'SELECT DISTINCT year FROM projects WHERE status = \'published\' AND deleted_at IS NULL
             AND year IS NOT NULL ORDER BY year DESC'
        )->fetchAll(PDO::FETCH_COLUMN);

        return array_map('intval', $rows);
    }

    /**
     * @return list<array{slug: string, updated_at: string}>
     */
    public function sitemapEntries(): array
    {
        /** @var list<array{slug: string, updated_at: string}> */
        return $this->pdo->query(
            'SELECT slug, updated_at FROM projects WHERE status = \'published\' AND deleted_at IS NULL'
        )->fetchAll();
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydrate(array $row): array
    {
        $row['key_facts'] = json_decode((string) ($row['key_facts'] ?? '[]'), true) ?: [];
        $row['category_label'] = self::CATEGORIES[$row['category']] ?? $row['category'];
        $row['role_label'] = $row['role'] === 'main_contractor' ? 'Main contractor' : 'Subcontractor';
        $row['show_value'] = (bool) $row['show_value'];
        $path = (string) ($row['photo_path'] ?? '');
        $row['photo_key'] = str_starts_with($path, 'stock/') ? substr($path, 6) : null;
        if (!$row['show_value']) {
            $row['value_pula'] = null;
        }

        return $row;
    }
}
