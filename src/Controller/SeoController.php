<?php

declare(strict_types=1);

namespace EvolutionEngineers\Controller;

use EvolutionEngineers\Domain\ServiceCatalog;
use EvolutionEngineers\Repository\HomeRepository;
use EvolutionEngineers\Repository\ProjectRepository;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class SeoController
{
    public function __construct(
        private readonly ProjectRepository $projects,
        private readonly HomeRepository $homes,
        private readonly string $baseUrl,
        private readonly bool $noindex,
    ) {
    }

    public function sitemap(Request $request, Response $response): Response
    {
        $paths = ['/', '/services', '/supplies', '/projects', '/small-homes', '/plant-and-equipment', '/about',
            '/contact', '/privacy', '/terms'];
        foreach (ServiceCatalog::all() as $service) {
            $paths[] = $service['url'];
        }
        foreach ($this->projects->sitemapEntries() as $p) {
            $paths[] = '/projects/' . $p['slug'];
        }
        foreach ($this->homes->published() as $h) {
            $paths[] = '/small-homes/' . $h['slug'];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($paths as $path) {
            $xml .= '  <url><loc>' . htmlspecialchars($this->baseUrl . $path, ENT_XML1) . '</loc></url>' . "\n";
        }
        $xml .= '</urlset>' . "\n";
        $response->getBody()->write($xml);

        return $response->withHeader('Content-Type', 'application/xml; charset=utf-8');
    }

    public function robots(Request $request, Response $response): Response
    {
        $body = $this->noindex
            ? "User-agent: *\nDisallow: /\n"
            : "User-agent: *\nDisallow: /admin\n\nSitemap: {$this->baseUrl}/sitemap.xml\n";
        $response->getBody()->write($body);

        return $response->withHeader('Content-Type', 'text/plain; charset=utf-8');
    }
}
