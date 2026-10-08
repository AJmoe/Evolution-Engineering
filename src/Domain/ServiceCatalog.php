<?php

declare(strict_types=1);

namespace EvolutionEngineers\Domain;

/**
 * The three disciplines and supplies, with scope taken word for word from the company profile.
 * Page copy stays in code for the first release, as the brief specifies.
 */
final class ServiceCatalog
{
    /**
     * @return array<string, array{slug: string, name: string, url: string, summary: string,
     *     scope: list<string>, clients: string, project_categories: list<string>, photo: string, photo_alt: string}>
     */
    public static function all(): array
    {
        return [
            'civil-engineering' => [
                'slug' => 'civil-engineering',
                'name' => 'Civil engineering',
                'url' => '/services/civil-engineering',
                'summary' => 'Roads, water, sewerage and land servicing, plus building design, construction and '
                    . 'maintenance.',
                'scope' => [
                    'Land servicing with roads, storm drainage, water, sewerage, sewage treatment works and street '
                        . 'lighting',
                    'Building design, including structural engineering',
                    'Building construction and maintenance',
                ],
                'clients' => 'Government ministries, district and city councils, utilities, mines and private '
                    . 'developers.',
                'project_categories' => ['roads', 'water_sewerage', 'civil_building', 'design_build'],
                'photo' => 'road-new',
                'photo_alt' => 'A newly surfaced road running through open, dry countryside',
            ],
            'mechanical-engineering' => [
                'slug' => 'mechanical-engineering',
                'name' => 'Mechanical engineering',
                'url' => '/services/mechanical-engineering',
                'summary' => 'Pump and motor maintenance, steel fabrication and welding, and pipe fitting from our '
                    . 'own workshop.',
                'scope' => [
                    'Maintenance of pumps and motors',
                    'Steel work, including fabrication and welding',
                    'Pipe fittings',
                ],
                'clients' => 'Mining operations, including Debswana at Jwaneng and Orapa, and utilities.',
                'project_categories' => ['mechanical'],
                'photo' => 'pipe-welding',
                'photo_alt' => 'A welder working inside a large steel pipe',
            ],
            'electrical-engineering' => [
                'slug' => 'electrical-engineering',
                'name' => 'Electrical engineering',
                'url' => '/services/electrical-engineering',
                'summary' => 'Electrical installations.',
                'scope' => ['Electrical installations'],
                'clients' => 'Public and private sector clients.',
                'project_categories' => [],
                'photo' => 'substation',
                'photo_alt' => 'Electrical switchgear and pylons at a substation',
            ],
        ];
    }

    /**
     * @return array{slug: string, name: string, url: string, summary: string, scope: list<string>,
     *     clients: string, project_categories: list<string>, photo: string, photo_alt: string}|null
     */
    public static function find(string $slug): ?array
    {
        return self::all()[$slug] ?? null;
    }

    /**
     * @return list<string>
     */
    public static function registrations(): array
    {
        return [
            'Building construction',
            'Fencing, ordinary and security',
            'Water engineering services',
            'Civil engineering, road drainage',
            'Roads ancillary works',
        ];
    }
}
