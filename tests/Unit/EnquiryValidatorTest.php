<?php

declare(strict_types=1);

namespace EvolutionEngineers\Tests\Unit;

use EvolutionEngineers\Service\EnquiryValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class EnquiryValidatorTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function valid(): array
    {
        return [
            'name' => 'Kabo Molefe',
            'email' => 'kabo@example.com',
            'phone' => '72 225 339',
            'type' => 'civil',
            'message' => 'Road works in Palapye.',
            'consent' => '1',
        ];
    }

    public function testValidInputPasses(): void
    {
        $result = (new EnquiryValidator())->validate($this->valid());
        self::assertSame([], $result['errors']);
        self::assertSame('+26772225339', $result['data']['phone']);
    }

    public function testRequiredFieldsAreReported(): void
    {
        $result = (new EnquiryValidator())->validate([]);
        self::assertSame(['name', 'email', 'type', 'consent'], array_keys($result['errors']));
    }

    public function testPhoneIsOptional(): void
    {
        $input = $this->valid();
        $input['phone'] = '';
        $result = (new EnquiryValidator())->validate($input);
        self::assertSame([], $result['errors']);
        self::assertNull($result['data']['phone']);
    }

    public function testMessageLengthIsLimited(): void
    {
        $input = $this->valid();
        $input['message'] = str_repeat('a', EnquiryValidator::MESSAGE_MAX + 1);
        $result = (new EnquiryValidator())->validate($input);
        self::assertArrayHasKey('message', $result['errors']);
    }

    public function testUnknownTypeIsRejected(): void
    {
        $input = $this->valid();
        $input['type'] = 'hacking';
        self::assertArrayHasKey('type', (new EnquiryValidator())->validate($input)['errors']);
    }

    public function testDesignSlugIsSanitised(): void
    {
        $input = $this->valid();
        $input['design'] = '../etc/passwd';
        self::assertNull((new EnquiryValidator())->validate($input)['data']['design']);
    }

    /**
     * @return array<string, array{string, ?string}>
     */
    public static function phones(): array
    {
        return [
            'landline' => ['392 3065', '+2673923065'],
            'mobile' => ['72 225 339', '+26772225339'],
            'international' => ['+267 72 225 339', '+26772225339'],
            'double zero' => ['00267 3923065', '+2673923065'],
            'dashes' => ['72-225-339', '+26772225339'],
            'too short' => ['12345', null],
            'mobile not starting 7' => ['82225339', null],
            'letters' => ['call me', null],
        ];
    }

    #[DataProvider('phones')]
    public function testPhoneNormalisation(string $raw, ?string $expected): void
    {
        self::assertSame($expected, EnquiryValidator::normalisePhone($raw));
    }
}
