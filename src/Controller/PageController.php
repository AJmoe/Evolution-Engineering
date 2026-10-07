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
        return $this->view->render($request, $response, 'pages/home.twig', [
            'services' => ServiceCatalog::all(),
            'featured' => $this->projects->featured(3),
            'homes' => $this->homes->published(),
            'registrations' => ServiceCatalog::registrations(),
            'equipment' => $this->catalogue->equipmentHighlights(8),
        ]);
    }

    public function services(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/services.twig', [
            'services' => ServiceCatalog::all(),
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
        return $this->view->render($request, $response, 'pages/about.twig', [
            'registrations' => ServiceCatalog::registrations(),
        ]);
    }

    public function privacy(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/privacy.twig');
    }

    public function terms(Request $request, Response $response): Response
    {
        return $this->view->render($request, $response, 'pages/terms.twig');
    }
}
