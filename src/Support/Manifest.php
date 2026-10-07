<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

/**
 * Reads Vite's manifest.json so templates can print hashed asset URLs.
 * In development, points at the Vite dev server instead.
 */
final class Manifest
{
    /** @var array<string, array<string, mixed>>|null */
    private ?array $entries = null;

    public function __construct(
        private readonly string $manifestPath,
        private readonly string $publicBase = '/assets/',
        private readonly string $devServer = '',
    ) {
    }

    public function isDev(): bool
    {
        return $this->devServer !== '';
    }

    public function devServer(): string
    {
        return rtrim($this->devServer, '/');
    }

    /**
     * @return array{file: string, css: list<string>, imports: list<string>}
     */
    public function entry(string $name): array
    {
        if ($this->isDev()) {
            return ['file' => $this->devServer() . '/' . $name, 'css' => [], 'imports' => []];
        }
        $entries = $this->load();
        $entry = $entries[$name] ?? null;
        if ($entry === null) {
            return ['file' => '', 'css' => [], 'imports' => []];
        }
        $css = [];
        foreach ((array) ($entry['css'] ?? []) as $file) {
            $css[] = $this->publicBase . $file;
        }
        $imports = [];
        foreach ((array) ($entry['imports'] ?? []) as $key) {
            if (isset($entries[$key]['file'])) {
                $imports[] = $this->publicBase . $entries[$key]['file'];
            }
        }

        return ['file' => $this->publicBase . $entry['file'], 'css' => $css, 'imports' => $imports];
    }

    /**
     * @return list<string> URLs of static assets (fonts, images) an entry references
     */
    public function assets(string $name): array
    {
        if ($this->isDev()) {
            return [];
        }
        $out = [];
        foreach ((array) ($this->load()[$name]['assets'] ?? []) as $file) {
            $out[] = $this->publicBase . $file;
        }

        return $out;
    }

    /**
     * Returns the built CSS file contents for inlining critical styles.
     */
    public function inlineCss(string $name): string
    {
        if ($this->isDev()) {
            return '';
        }
        $out = '';
        foreach ($this->entry($name)['css'] as $href) {
            // manifest lives at public/assets/.vite/manifest.json, hrefs start with /assets/
            $path = dirname($this->manifestPath, 3) . $href;
            if (is_file($path)) {
                $out .= (string) file_get_contents($path);
            }
        }

        return $out;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function load(): array
    {
        if ($this->entries === null) {
            $json = is_file($this->manifestPath) ? (string) file_get_contents($this->manifestPath) : '{}';
            $decoded = json_decode($json, true);
            $this->entries = is_array($decoded) ? $decoded : [];
        }

        return $this->entries;
    }
}
