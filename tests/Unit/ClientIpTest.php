<?php

declare(strict_types=1);

namespace EvolutionEngineers\Tests\Unit;

use EvolutionEngineers\Support\ClientIp;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ServerRequestFactory;

final class ClientIpTest extends TestCase
{
    private function request(string $forwarded): \Psr\Http\Message\ServerRequestInterface
    {
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/contact', ['REMOTE_ADDR' => '10.0.0.5']);

        return $forwarded === '' ? $request : $request->withHeader('X-Forwarded-For', $forwarded);
    }

    public function testUsesRemoteAddressWhenProxyIsNotTrusted(): void
    {
        self::assertSame('10.0.0.5', ClientIp::from($this->request('41.75.1.2'), false));
    }

    public function testUsesTheAddressTheProxySawWhenTrusted(): void
    {
        // A visitor can forge the first entries; the last one was added by the proxy.
        self::assertSame('41.75.1.2', ClientIp::from($this->request('1.2.3.4, 41.75.1.2'), true));
    }

    public function testFallsBackWhenTheHeaderIsMissingOrInvalid(): void
    {
        self::assertSame('10.0.0.5', ClientIp::from($this->request(''), true));
        self::assertSame('10.0.0.5', ClientIp::from($this->request('not-an-ip'), true));
    }
}
