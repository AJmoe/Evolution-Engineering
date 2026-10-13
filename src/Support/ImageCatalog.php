<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

/**
 * Knows which photos exist, their dimensions and their credits: the interim stock set and the
 * client's own site photos (marked "own"). Reads resources/images/stock/credits.json, written by
 * tools/stock-download.mjs and tools/site-photos.mjs.
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
     * @return array{key: string, width: int, height: int, widths: list<int>, own: bool}|null
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

        return [
            'key' => $key,
            'width' => $width,
            'height' => (int) $item['height'],
            'widths' => $widths,
            'own' => (bool) ($item['own'] ?? false),
        ];
    }

    /**
     * Openly licensed photos that need a credit; the client's own photos are left out.
     *
     * @return array<string, array<string, mixed>>
     */
    public function credits(): array
    {
        return array_filter($this->all(), fn (array $item): bool => !($item['own'] ?? false));
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
