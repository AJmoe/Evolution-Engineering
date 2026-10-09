<?php

declare(strict_types=1);

namespace EvolutionEngineers\Controller;

use EvolutionEngineers\Domain\ServiceCatalog;
use EvolutionEngineers\Repository\CatalogueRepository;
use EvolutionEngineers\Repository\HomeRepository;
use EvolutionEngineers\Repository\ProjectRepository;
use EvolutionEngineers\Support\View;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Exception\HttpNotFoundException;

final class PageController
{
    public function __construct(
        private readonly View $view,
        private readonly ProjectRepository $projects,
        private readonly HomeRepository $homes,
        private readonly CatalogueRepository $catalogue,
    ) {
    }

    public function home(Request $request, Response $response): Response
    {
        $all = $this->projects->published();
        $main = count(array_filter($all, static fn (array $p): bool => $p['role'] === 'main_contractor'));
        $dated = array_values(array_filter($all, static fn (array $p): bool => $p['year'] !== null));

        return $this->view->render($request, $response, 'pages/home.twig', [
            'services' => ServiceCatalog::all(),
            'service_cards' => ServiceCatalog::cards(),
            'tiles' => $this->tiles($all, 4),
            'recent' => array_slice($dated, 0, 3),
            'stats' => [
                'projects' => count($all),
                'main_contractor' => $main,
                'main_share' => $all ? (int) round($main / count($all) * 100) : 0,
                'in_progress' => array_values(array_filter($all, static fn (array $p): bool => $p['year'] === null)),
            ],
            'homes' => $this->homes->published(),
            'registrations' => ServiceCatalog::registrations(),
            'equipment' => $this->catalogue->equipmentHighlights(8),
        ]);
    }

    public function services(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/services.twig', [
            'services' => ServiceCatalog::all(),
            'service_cards' => ServiceCatalog::cards(),
            'supplies' => $this->catalogue->suppliesByCategory(),
        ]);
    }

    /**
     * @param array<string, string> $args
     */
    public function serviceDetail(Request $request, Response $response, array $args): Response
    {
        $service = ServiceCatalog::find($args['slug']);
        if ($service === null) {
            throw new HttpNotFoundException($request);
        }

        return $this->view->render($request, $response, 'pages/service-detail.twig', [
            'service' => $service,
            'related' => $this->projects->byCategories($service['project_categories'], 3),
            'others' => array_filter(
                ServiceCatalog::all(),
                static fn (array $s): bool => $s['slug'] !== $service['slug']
            ),
        ]);
    }

    public function supplies(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/supplies.twig', [
            'groups' => $this->catalogue->suppliesByCategory(),
        ]);
    }

    public function plant(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/plant.twig', [
            'groups' => $this->catalogue->equipmentByGroup(),
        ]);
    }

    public function about(Request $request, Response $response): Response
    {
        $all = $this->projects->published();

        return $this->view->render($request, $response, 'pages/about.twig', [
            'registrations' => ServiceCatalog::registrations(),
            'stats' => [
                'projects' => count($all),
                'main_contractor' => count(array_filter(
                    $all,
                    static fn (array $p): bool => $p['role'] === 'main_contractor'
                )),
                'years' => (int) date('Y') - 2007,
                'disciplines' => count(ServiceCatalog::registrations()),
            ],
        ]);
    }

    /**
     * Featured projects first, then the most recent ones with a photo, for the homepage tiles.
     *
     * @param list<array<string, mixed>> $all
     * @return list<array<string, mixed>>
     */
    private function tiles(array $all, int $count): array
    {
        $featured = array_filter($all, static fn (array $p): bool => (bool) $p['featured']);
        $others = array_filter($all, static fn (array $p): bool => !$p['featured'] && $p['photo_key'] !== null);

        return array_slice([...$featured, ...$others], 0, $count);
    }

    public function privacy(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/privacy.twig');
    }

    public function credits(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/credits.twig');
    }

    public function terms(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/terms.twig');
    }
}
