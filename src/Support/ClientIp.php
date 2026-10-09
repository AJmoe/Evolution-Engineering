<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

use Psr\Http\Message\ServerRequestInterface;

/**
 * The visitor's IP address, used only for the hashed enquiry rate limit.
 * Behind a trusted reverse proxy (Render, a load balancer) REMOTE_ADDR is the proxy, so the last
 * X-Forwarded-For entry is used instead: it is the address the proxy itself saw, which a visitor cannot forge.
 */
final class ClientIp
{
    public static function from(ServerRequestInterface $request, bool $trustProxy): string
    {
        $remote = (string) ($request->getServerParams()['REMOTE_ADDR'] ?? '0.0.0.0');
        if (!$trustProxy) {
            return $remote;
        }
        $hops = array_values(array_filter(array_map('trim', explode(',', $request->getHeaderLine('X-Forwarded-For')))));
        $last = $hops === [] ? '' : $hops[count($hops) - 1];

        return filter_var($last, FILTER_VALIDATE_IP) !== false ? $last : $remote;
    }
}
