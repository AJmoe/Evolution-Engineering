<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

/**
 * Knows which interim photos exist, their dimensions and their credits.
 * Reads resources/images/stock/credits.json, written by tools/stock-download.mjs.
 */
final class ImageCatalog
{
    public const WIDTHS = [400, 800, 1200, 1600];

    /** @var array<string, array<string, mixed>>|null */
    private ?array $items = null;

    public function __construct(private readonly string $creditsFile, private readonly string $publicDir)
    {
    }

    public function has(string $key): bool
    {
        return isset($this->all()[$key]);
    }

    /**
     * @return array{key: string, width: int, height: int, widths: list<int>}|null
     */
    public function get(string $key): ?array
    {
        $item = $this->all()[$key] ?? null;
        if ($item === null) {
            return null;
        }
        $width = (int) $item['width'];
        $widths = array_values(array_filter(
            self::WIDTHS,
            fn (int $w): bool => $w <= max($width, 400) && is_file("{$this->publicDir}/{$key}-{$w}.webp")
        ));

        return ['key' => $key, 'width' => $width, 'height' => (int) $item['height'], 'widths' => $widths];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function all(): array
    {
        if ($this->items === null) {
            $json = is_file($this->creditsFile) ? (string) file_get_contents($this->creditsFile) : '{}';
            $decoded = json_decode($json, true);
            $this->items = is_array($decoded) ? $decoded : [];
        }

        return $this->items;
    }
}
