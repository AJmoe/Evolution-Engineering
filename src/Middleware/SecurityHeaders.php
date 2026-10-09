<?php

declare(strict_types=1);

namespace EvolutionEngineers\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Sets a nonce-based Content-Security-Policy and the other security headers from the brief.
 * The nonce is generated per request and exposed to templates through the request attribute.
 */
final class SecurityHeaders implements MiddlewareInterface
{
    public function __construct(
        private readonly bool $https,
        private readonly string $devServer = '',
        private readonly bool $noindex = false,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $nonce = base64_encode(random_bytes(16));
        $response = $handler->handle($request->withAttribute('csp_nonce', $nonce));

        $script = "'self' 'nonce-$nonce'";
        $connect = "'self'";
        $style = "'self' 'nonce-$nonce'";
        if ($this->devServer !== '') {
            $script .= ' ' . $this->devServer;
            $style .= ' ' . $this->devServer . " 'unsafe-inline'";
            $connect .= ' ' . $this->devServer . ' ' . preg_replace('#^http#', 'ws', $this->devServer);
        }
        $csp = implode('; ', [
            "default-src 'self'",
            "script-src $script",
            "style-src $style",
            "img-src 'self' data: blob:",
            "font-src 'self'" . ($this->devServer !== '' ? ' ' . $this->devServer : ''),
            "connect-src $connect",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            // The contact map on the homepage and contact page is a Google Maps embed.
            'frame-src https://www.google.com https://maps.google.com',
        ]);

        $response = $response
            ->withHeader('Content-Security-Policy', $csp)
            ->withHeader('X-Content-Type-Options', 'nosniff')
            ->withHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->withHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
            ->withHeader('Cross-Origin-Opener-Policy', 'same-origin');

        if ($this->https) {
            $response = $response->withHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
        if ($this->noindex) {
            $response = $response->withHeader('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }
}
