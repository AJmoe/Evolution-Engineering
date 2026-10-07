<?php

declare(strict_types=1);

namespace EvolutionEngineers\Service;

use EvolutionEngineers\Repository\EnquiryRepository;
use EvolutionEngineers\Repository\HomeRepository;

/**
 * Saves an enquiry first, then emails it. If mail fails the record stays, flagged for the admin.
 */
final class EnquiryService
{
    public const RATE_LIMIT = 5;
    public const RATE_WINDOW = 3600;

    public function __construct(
        private readonly EnquiryRepository $enquiries,
        private readonly HomeRepository $homes,
        private readonly EnquiryRouter $router,
        private readonly MailService $mail,
        private readonly string $secret,
    ) {
    }

    public function hashIp(string $ip): string
    {
        return hash_hmac('sha256', $ip, $this->secret);
    }

    public function isRateLimited(string $ip): bool
    {
        return $this->enquiries->countRecentFromIp($this->hashIp($ip), self::RATE_WINDOW) >= self::RATE_LIMIT;
    }

    /**
     * @param array{name: string, email: string, phone: ?string, type: string, message: ?string, design: ?string} $data
     */
    public function submit(array $data, string $ip): int
    {
        $home = $data['design'] !== null ? $this->homes->findBySlug($data['design']) : null;
        $id = $this->enquiries->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'type' => $data['type'],
            'message' => $data['message'],
            'home_id' => $home !== null ? (int) $home['id'] : null,
        ], $this->hashIp($ip));

        $typeLabel = EnquiryValidator::TYPES[$data['type']] ?? $data['type'];
        $lines = [
            'New website enquiry #' . $id,
            '',
            'Type: ' . $typeLabel,
            'Name: ' . $data['name'],
            'Email: ' . $data['email'],
            'Phone: ' . ($data['phone'] ?? 'not given'),
        ];
        if ($home !== null) {
            $lines[] = 'Design: ' . $home['name'];
        }
        $lines[] = '';
        $lines[] = $data['message'] ?? '(no project details given)';

        $sent = $this->mail->send(
            $this->router->mailboxFor($data['type']),
            'Website enquiry: ' . $typeLabel . ' from ' . $data['name'],
            implode("\n", $lines),
            $data['email']
        );
        $this->enquiries->markMail($id, $sent ? 'sent' : 'failed');

        if ($sent) {
            $this->mail->send(
                $data['email'],
                'We have received your enquiry',
                "Hello {$data['name']},\n\nThank you for contacting Evolution Engineers. We have received your "
                    . "enquiry about " . mb_strtolower($typeLabel) . " and will reply soon.\n\n"
                    . "Evolution Engineers\nPlot 61047, Block 8 Industrial, Gaborone\n392 3065"
            );
        }

        return $id;
    }
}
