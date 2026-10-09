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
        $search = is_string($query['q'] ?? null) ? trim(mb_substr($query['q'], 0, 80)) : '';

        $all = $this->projects->published();
        if ($search !== '') {
            // Site search from the header: match title, client and summary, case-insensitively.
            $all = array_values(array_filter($all, static fn (array $p): bool => mb_stripos(
                $p['title'] . ' ' . $p['client_name'] . ' ' . ($p['summary'] ?? ''),
                $search
            ) !== false));
        }
        $visible = array_filter($all, static fn (array $p): bool => ($type === null || $p['category'] === $type)
            && ($year === null || (int) $p['year'] === $year));

        return $this->view->render($request, $response, 'pages/projects.twig', [
            'projects' => $visible,
            'all_projects' => $all,
            'search' => $search,
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
