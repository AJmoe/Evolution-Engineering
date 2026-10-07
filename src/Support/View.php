<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

use EvolutionEngineers\Repository\CatalogueRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Views\Twig;

/**
 * Renders a page template with the data every page needs:
 * site settings, CSP nonce, CSRF token, canonical URL and the current section.
 */
final class View
{
    public function __construct(
        private readonly Twig $twig,
        private readonly CatalogueRepository $catalogue,
        private readonly string $baseUrl,
        private readonly bool $noindex,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public function render(
        ServerRequestInterface $request,
        ResponseInterface $response,
        string $template,
        array $data = [],
        int $status = 200,
    ): ResponseInterface {
        $path = $request->getUri()->getPath();
        $data += [
            'settings' => $this->catalogue->settings(),
            'csp_nonce' => $request->getAttribute('csp_nonce', ''),
            'csrf_token' => $request->getAttribute('csrf_token', ''),
            'current_path' => $path,
            'section' => '/' . explode('/', trim($path, '/'))[0],
            'canonical' => $this->baseUrl . ($path === '/' ? '/' : rtrim($path, '/')),
            'base_url' => $this->baseUrl,
            'noindex' => $this->noindex,
            'year_now' => (int) date('Y'),
        ];

        return $this->twig->render($response->withStatus($status), $template, $data)
            ->withHeader('Content-Type', 'text/html; charset=utf-8')
            ->withHeader('Cache-Control', 'no-cache');
    }
}
