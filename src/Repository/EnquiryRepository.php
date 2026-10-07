<?php

declare(strict_types=1);

namespace EvolutionEngineers\Repository;

use PDO;

final class EnquiryRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @param array{name: string, email: string, phone: ?string, type: string, message: ?string, home_id: ?int} $data
     */
    public function create(array $data, string $ipHash): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO enquiries (name, email, phone, type, message, home_id, consent_at, ip_hash, mail_status)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, \'pending\')'
        );
        $stmt->execute([
            $data['name'], $data['email'], $data['phone'], $data['type'], $data['message'], $data['home_id'], $ipHash,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function markMail(int $id, string $status): void
    {
        $this->pdo->prepare('UPDATE enquiries SET mail_status = ? WHERE id = ?')->execute([$status, $id]);
    }

    public function countRecentFromIp(string $ipHash, int $seconds): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM enquiries WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL ? SECOND)'
        );
        $stmt->execute([$ipHash, $seconds]);

        return (int) $stmt->fetchColumn();
    }
}
