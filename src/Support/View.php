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
        /** Resolves the repository lazily, so a page can still render when the database is down. */
        private readonly \Closure $catalogue,
        private readonly string $baseUrl,
        private readonly bool $noindex,
    ) {
    }

    /**
     * Contact details used when the database cannot be read, so error pages still render with a way to reach us.
     */
    private const FALLBACK_SETTINGS = [
        'address_line' => 'Plot 61047, Block 8 Industrial, Gaborone',
        'postal_address' => 'P. O. Box 1993 AAD, Gaborone, Botswana',
        'phone' => '392 3065',
        'phone_e164' => '+2673923065',
        'cell' => '72 225 339',
        'cell_e164' => '+26772225339',
        'fax' => '',
        'email_general' => 'info@evolutionengineers.co.bw',
        'email_tenders' => 'info@evolutionengineers.co.bw',
        'email_homes' => 'info@evolutionengineers.co.bw',
        'emails_are_placeholders' => '0',
    ];

    /**
     * @return array<string, string>
     */
    private function settings(): array
    {
        try {
            /** @var CatalogueRepository $catalogue */
            $catalogue = ($this->catalogue)();

            return $catalogue->settings() + self::FALLBACK_SETTINGS;
        } catch (\Throwable) {
            return self::FALLBACK_SETTINGS;
        }
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
            'settings' => $this->settings(),
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
