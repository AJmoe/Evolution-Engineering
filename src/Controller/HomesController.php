<?php

declare(strict_types=1);

namespace EvolutionEngineers\Controller;

use EvolutionEngineers\Repository\HomeRepository;
use EvolutionEngineers\Support\View;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Exception\HttpNotFoundException;

final class HomesController
{
    public function __construct(private readonly View $view, private readonly HomeRepository $homes)
    {
    }

    public function index(Request $request, Response $response): Response
    {
        $homes = $this->homes->published();
        $selected = $request->getQueryParams()['design'] ?? null;
        $active = $homes[0] ?? null;
        foreach ($homes as $home) {
            if ($home['slug'] === $selected) {
                $active = $home;
            }
        }

        return $this->view->render($request, $response, 'pages/small-homes.twig', [
            'homes' => $homes,
            'active' => $active,
        ]);
    }

    /**
     * @param array<string, string> $args
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $home = $this->homes->findBySlug($args['slug']);
        if ($home === null) {
            throw new HttpNotFoundException($request);
        }

        return $this->view->render($request, $response, 'pages/home-design.twig', [
            'home' => $home,
            'others' => array_values(array_filter(
                $this->homes->published(),
                static fn (array $h): bool => $h['slug'] !== $home['slug']
            )),
        ]);
    }
}
