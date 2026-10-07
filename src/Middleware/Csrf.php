<?php

declare(strict_types=1);

namespace EvolutionEngineers\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Stateless double-submit CSRF protection, so the public site needs no session cookie.
 * The token is an HMAC of a random value, carried in a hidden field and checked on POST.
 * Tokens expire after two hours.
 */
final class Csrf implements MiddlewareInterface
{
    private const TTL = 7200;

    public function __construct(private readonly string $secret)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (in_array($request->getMethod(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $body = (array) $request->getParsedBody();
            $token = is_string($body['_csrf'] ?? null) ? $body['_csrf'] : '';
            if (!$this->valid($token)) {
                $response = new Response(400);
                $response->getBody()->write(
                    'Your form session expired. Go back, reload the page and send the form again.'
                );

                return $response->withHeader('Content-Type', 'text/plain; charset=utf-8');
            }
        }

        return $handler->handle($request->withAttribute('csrf_token', $this->issue()));
    }

    public function issue(?int $time = null): string
    {
        $time ??= time();
        $rand = bin2hex(random_bytes(8));
        $payload = $time . '.' . $rand;

        return $payload . '.' . hash_hmac('sha256', $payload, $this->secret);
    }

    public function valid(string $token, ?int $now = null): bool
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3 || !ctype_digit($parts[0])) {
            return false;
        }
        [$time, $rand, $mac] = $parts;
        $expected = hash_hmac('sha256', $time . '.' . $rand, $this->secret);
        $age = ($now ?? time()) - (int) $time;

        return hash_equals($expected, $mac) && $age >= 0 && $age <= self::TTL;
    }

    /**
     * The token carries its issue time, which doubles as the minimum fill time check.
     */
    public static function issuedAt(string $token): ?int
    {
        $first = explode('.', $token)[0];

        return ctype_digit($first) ? (int) $first : null;
    }
}
