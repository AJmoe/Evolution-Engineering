<?php

declare(strict_types=1);

namespace EvolutionEngineers\Service;

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;
use Psr\Log\LoggerInterface;

final class MailService
{
    /**
     * @param array<string, mixed> $env
     */
    public function __construct(private readonly array $env, private readonly LoggerInterface $logger)
    {
    }

    public function send(string $to, string $subject, string $body, ?string $replyTo = null): bool
    {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = (string) ($this->env['MAIL_HOST'] ?? 'localhost');
            $mail->Port = (int) ($this->env['MAIL_PORT'] ?? 25);
            $user = (string) ($this->env['MAIL_USER'] ?? '');
            if ($user !== '') {
                $mail->SMTPAuth = true;
                $mail->Username = $user;
                $mail->Password = (string) ($this->env['MAIL_PASS'] ?? '');
            }
            $encryption = (string) ($this->env['MAIL_ENCRYPTION'] ?? '');
            if ($encryption !== '') {
                $mail->SMTPSecure = $encryption;
            } else {
                $mail->SMTPAutoTLS = false;
            }
            $mail->CharSet = 'UTF-8';
            $mail->setFrom(
                (string) ($this->env['MAIL_FROM'] ?? 'website@localhost'),
                (string) ($this->env['MAIL_FROM_NAME'] ?? 'Website')
            );
            $mail->addAddress($to);
            if ($replyTo !== null) {
                $mail->addReplyTo($replyTo);
            }
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->isHTML(false);
            $mail->Timeout = 10;

            return $mail->send();
        } catch (MailException $e) {
            $this->logger->error('Mail send failed', ['error' => $e->getMessage(), 'subject' => $subject]);

            return false;
        }
    }
}
