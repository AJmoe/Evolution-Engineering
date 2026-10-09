<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

final class TwigExtension extends AbstractExtension
{
    public function __construct(
        private readonly Manifest $manifest,
        private readonly ?ImageCatalog $images = null,
        private readonly string $publicDir = '',
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('vite_css', [$this, 'css'], ['is_safe' => ['html']]),
            new TwigFunction('vite_js', [$this, 'js'], ['is_safe' => ['html']]),
            new TwigFunction('vite_url', [$this, 'url']),
            new TwigFunction('vite_inline_css', [$this->manifest, 'inlineCss'], ['is_safe' => ['html']]),
            new TwigFunction('vite_dev', [$this->manifest, 'isDev']),
            new TwigFunction('vite_preload_fonts', [$this, 'preloadFonts'], ['is_safe' => ['html']]),
            new TwigFunction('photo_meta', fn (?string $key): ?array => $key ? $this->images?->get($key) : null),
            new TwigFunction('svg_size', [$this, 'svgSize']),
            new TwigFunction('photo_credits', fn (): array => $this->images?->all() ?? []),
        ];
    }

    /**
     * @param list<string> $prefixes font file name prefixes to preload, such as 'fraunces-latin-300'
     */
    public function preloadFonts(string $entry, array $prefixes): string
    {
        $out = '';
        foreach ($this->manifest->assets($entry) as $url) {
            foreach ($prefixes as $prefix) {
                if (str_starts_with(basename($url), $prefix) && str_ends_with($url, '.woff2')) {
                    $out .= '<link rel="preload" href="' . htmlspecialchars($url)
                        . '" as="font" type="font/woff2" crossorigin>';
                }
            }
        }

        return $out;
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('tel', static fn (string $v): string => preg_replace('/[^0-9+]/', '', $v) ?? ''),
            new TwigFilter('excerpt', [self::class, 'excerpt']),
        ];
    }

    /**
     * Collapses whitespace and shortens text to at most $max characters on a word boundary,
     * for meta descriptions (search results show about 155 to 160 characters).
     */
    public static function excerpt(string $text, int $max = 158): string
    {
        $text = trim((string) preg_replace('/\s+/', ' ', strip_tags($text)));
        if (mb_strlen($text) <= $max) {
            return $text;
        }
        $cut = mb_substr($text, 0, $max - 1);
        $space = mb_strrpos($cut, ' ');

        return rtrim($space !== false ? mb_substr($cut, 0, $space) : $cut, ' ,;:.') . '…';
    }

    /**
     * Intrinsic width and height of a public SVG, from its viewBox, so <img> tags can reserve space.
     *
     * @return array{width: int, height: int}|null
     */
    public function svgSize(string $publicPath): ?array
    {
        $file = $this->publicDir . '/' . ltrim($publicPath, '/');
        $head = is_file($file) ? (string) file_get_contents($file, false, null, 0, 400) : '';
        if (!preg_match('/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/', $head, $m)) {
            return null;
        }

        return ['width' => (int) round((float) $m[1]), 'height' => (int) round((float) $m[2])];
    }

    public function css(string $entry): string
    {
        $out = '';
        foreach ($this->manifest->entry($entry)['css'] as $href) {
            $out .= '<link rel="stylesheet" href="' . htmlspecialchars($href) . '">';
        }

        return $out;
    }

    public function js(string $entry, string $nonce): string
    {
        $n = htmlspecialchars($nonce);
        if ($this->manifest->isDev()) {
            $dev = htmlspecialchars($this->manifest->devServer());

            return '<script type="module" nonce="' . $n . '" src="' . $dev . '/@vite/client"></script>'
                . '<script type="module" nonce="' . $n . '" src="' . $dev . '/' . htmlspecialchars($entry)
                . '"></script>';
        }
        $e = $this->manifest->entry($entry);
        if ($e['file'] === '') {
            return '';
        }
        $out = '';
        foreach ($e['imports'] as $import) {
            $out .= '<link rel="modulepreload" href="' . htmlspecialchars($import) . '">';
        }

        return $out . '<script type="module" nonce="' . $n . '" src="' . htmlspecialchars($e['file']) . '"></script>';
    }

    public function url(string $entry): string
    {
        return $this->manifest->entry($entry)['file'];
    }
}
