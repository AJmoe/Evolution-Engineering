<?php

declare(strict_types=1);

namespace EvolutionEngineers\Controller;

use EvolutionEngineers\Repository\ProjectRepository;
use EvolutionEngineers\Support\View;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Exception\HttpNotFoundException;

final class ProjectController
{
    public function __construct(private readonly View $view, private readonly ProjectRepository $projects)
    {
    }

    public function index(Request $request, Response $response): Response
    {
        $query = $request->getQueryParams();
        $type = is_string($query['type'] ?? null) && isset(ProjectRepository::CATEGORIES[$query['type']])
            ? $query['type'] : null;
        $years = $this->projects->years();
        $year = isset($query['year']) && in_array((int) $query['year'], $years, true) ? (int) $query['year'] : null;

        return $this->view->render($request, $response, 'pages/projects.twig', [
            'projects' => $this->projects->published($type, $year),
            'all_projects' => $this->projects->published(),
            'categories' => ProjectRepository::CATEGORIES,
            'years' => $years,
            'active_type' => $type,
            'active_year' => $year,
        ]);
    }

    /**
     * @param array<string, string> $args
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $project = $this->projects->findBySlug($args['slug']);
        if ($project === null) {
            throw new HttpNotFoundException($request);
        }

        return $this->view->render($request, $response, 'pages/project.twig', [
            'project' => $project,
            'related' => $this->projects->byCategories([(string) $project['category']], 3, (string) $project['slug']),
        ]);
    }
}
