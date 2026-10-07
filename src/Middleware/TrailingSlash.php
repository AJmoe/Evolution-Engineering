<?php

declare(strict_types=1);

namespace EvolutionEngineers\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Redirects /path/ to /path with a 301 so every page has one clean URL.
 */
final class TrailingSlash implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $uri = $request->getUri();
        $path = $uri->getPath();
        if ($path !== '/' && str_ends_with($path, '/') && $request->getMethod() === 'GET') {
            $target = (string) $uri->withPath(rtrim($path, '/'));

            return (new Response(301))->withHeader('Location', $target);
        }

        return $handler->handle($request);
    }
}
