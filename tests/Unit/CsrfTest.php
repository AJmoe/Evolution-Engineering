<?php

declare(strict_types=1);

namespace EvolutionEngineers\Tests\Unit;

use EvolutionEngineers\Middleware\Csrf;
use PHPUnit\Framework\TestCase;

final class CsrfTest extends TestCase
{
    public function testIssuedTokenIsValid(): void
    {
        $csrf = new Csrf('a-test-secret-of-good-length');
        self::assertTrue($csrf->valid($csrf->issue()));
    }

    public function testTamperedTokenIsRejected(): void
    {
        $csrf = new Csrf('a-test-secret-of-good-length');
        $token = $csrf->issue();
        self::assertFalse($csrf->valid($token . 'x'));
        self::assertFalse($csrf->valid(''));
        self::assertFalse($csrf->valid('1.2'));
    }

    public function testTokenFromAnotherSecretIsRejected(): void
    {
        $token = (new Csrf('first-secret-of-good-length'))->issue();
        self::assertFalse((new Csrf('second-secret-of-good-length'))->valid($token));
    }

    public function testExpiredTokenIsRejected(): void
    {
        $csrf = new Csrf('a-test-secret-of-good-length');
        $token = $csrf->issue(1000);
        self::assertTrue($csrf->valid($token, 1000 + 60));
        self::assertFalse($csrf->valid($token, 1000 + 7201));
        self::assertSame(1000, Csrf::issuedAt($token));
    }
}
