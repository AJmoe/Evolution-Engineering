<?php

declare(strict_types=1);

namespace EvolutionEngineers\Service;

/**
 * Decides which mailbox receives an enquiry, as the brief specifies:
 * technical work and supplies go to tenders, small homes go to homes, everything else goes to general.
 */
final class EnquiryRouter
{
    private const TENDERS = ['civil', 'building', 'mechanical', 'electrical', 'supplies'];

    /**
     * @param array<string, string> $settings
     */
    public function __construct(private readonly array $settings)
    {
    }

    public function mailboxFor(string $type): string
    {
        if (in_array($type, self::TENDERS, true)) {
            return $this->settings['email_tenders'] ?? '';
        }
        if ($type === 'small_home') {
            return $this->settings['email_homes'] ?? '';
        }

        return $this->settings['email_general'] ?? '';
    }
}
