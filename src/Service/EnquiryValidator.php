<?php

declare(strict_types=1);

namespace EvolutionEngineers\Service;

/**
 * Validates and normalises contact form input. Pure, so it is easy to unit test.
 * Every error says what is wrong and how to fix it.
 */
final class EnquiryValidator
{
    public const TYPES = [
        'civil' => 'Civil works',
        'building' => 'Building construction',
        'small_home' => 'Small home design',
        'mechanical' => 'Mechanical works',
        'electrical' => 'Electrical works',
        'supplies' => 'Supplies',
        'other' => 'Something else',
    ];

    public const MESSAGE_MAX = 2000;

    /**
     * @param array<string, mixed> $input
     * @return array{data: array{name: string, email: string, phone: ?string, type: string, message: ?string,
     *     design: ?string}, errors: array<string, string>}
     */
    public function validate(array $input): array
    {
        $errors = [];
        $name = $this->clean($input['name'] ?? '');
        $email = $this->clean($input['email'] ?? '');
        $phone = $this->clean($input['phone'] ?? '');
        $type = $this->clean($input['type'] ?? '');
        $message = trim(str_replace("\r\n", "\n", is_string($input['message'] ?? null) ? $input['message'] : ''));
        $design = $this->clean($input['design'] ?? '');

        if ($name === '') {
            $errors['name'] = 'Enter your name.';
        } elseif (mb_strlen($name) > 160) {
            $errors['name'] = 'Shorten your name to 160 characters or fewer.';
        }

        if ($email === '') {
            $errors['email'] = 'Enter your email address so we can reply.';
        } elseif (mb_strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Enter an email address in the format name@example.com.';
        }

        $normalisedPhone = null;
        if ($phone !== '') {
            $normalisedPhone = self::normalisePhone($phone);
            if ($normalisedPhone === null) {
                $errors['phone'] = 'Enter a Botswana number, such as 392 3065, 72 225 339 or +267 72 225 339, '
                    . 'or leave this blank.';
            }
        }

        if (!array_key_exists($type, self::TYPES)) {
            $errors['type'] = 'Choose what you need from the list.';
        }

        if (mb_strlen($message) > self::MESSAGE_MAX) {
            $errors['message'] = sprintf(
                'Shorten your project details to %d characters or fewer. You have %d.',
                self::MESSAGE_MAX,
                mb_strlen($message)
            );
        }

        if (($input['consent'] ?? '') !== '1') {
            $errors['consent'] = 'Tick the box to agree to the privacy notice so we can store your enquiry.';
        }

        return [
            'data' => [
                'name' => $name,
                'email' => $email,
                'phone' => $normalisedPhone,
                'type' => $type,
                'message' => $message === '' ? null : $message,
                'design' => preg_match('/^[a-z0-9-]{1,160}$/', $design) === 1 ? $design : null,
            ],
            'errors' => $errors,
        ];
    }

    /**
     * Accepts Botswana landlines (7 digits) and mobiles (8 digits starting with 7),
     * with or without the +267 or 00267 prefix. Returns E.164 or null.
     */
    public static function normalisePhone(string $raw): ?string
    {
        $digits = preg_replace('/[\s\-().]/', '', $raw) ?? '';
        if (str_starts_with($digits, '+267')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '00267')) {
            $digits = substr($digits, 5);
        }
        if (preg_match('/^(7\d{7}|[2-6]\d{6})$/', $digits) !== 1) {
            return null;
        }

        return '+267' . $digits;
    }

    private function clean(mixed $value): string
    {
        if (!is_string($value)) {
            return '';
        }

        return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '');
    }
}
