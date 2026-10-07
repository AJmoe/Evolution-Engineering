<?php

declare(strict_types=1);

namespace EvolutionEngineers\Tests\Unit;

use EvolutionEngineers\Service\EnquiryRouter;
use EvolutionEngineers\Service\EnquiryValidator;
use PHPUnit\Framework\TestCase;

final class EnquiryRouterTest extends TestCase
{
    public function testEveryTypeRoutesToTheRightMailbox(): void
    {
        $router = new EnquiryRouter([
            'email_general' => 'info@x',
            'email_tenders' => 'tenders@x',
            'email_homes' => 'homes@x',
        ]);
        $expected = [
            'civil' => 'tenders@x',
            'building' => 'tenders@x',
            'mechanical' => 'tenders@x',
            'electrical' => 'tenders@x',
            'supplies' => 'tenders@x',
            'small_home' => 'homes@x',
            'other' => 'info@x',
        ];
        self::assertEqualsCanonicalizing(array_keys(EnquiryValidator::TYPES), array_keys($expected));
        foreach ($expected as $type => $mailbox) {
            self::assertSame($mailbox, $router->mailboxFor($type), $type);
        }
    }
}
