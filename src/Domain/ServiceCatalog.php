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
     * Service cards for the homepage and services slider: the three disciplines, supplies, and the
     * project types from the company profile. Each links to the page that covers it.
     *
     * @return list<array{name: string, icon: string, url: string, photo: string, photo_alt: string}>
     */
    public static function cards(): array
    {
        return [
            ['name' => "Civil\nEngineering", 'icon' => 'civil', 'url' => '/services/civil-engineering',
                'photo' => 'road-new', 'photo_alt' => 'A road under construction in open countryside'],
            ['name' => "Mechanical\nEngineering", 'icon' => 'mechanical', 'url' => '/services/mechanical-engineering',
                'photo' => 'pipe-welding', 'photo_alt' => 'A welder working inside a large steel pipe'],
            ['name' => "Electrical\nEngineering", 'icon' => 'electrical', 'url' => '/services/electrical-engineering',
                'photo' => 'substation', 'photo_alt' => 'Switchgear and pylons at a substation'],
            ['name' => "Valves, Pipes\n& Motors", 'icon' => 'supplies', 'url' => '/supplies',
                'photo' => 'gate-valve', 'photo_alt' => 'A large industrial gate valve'],
            ['name' => "Roads\nWorks", 'icon' => 'roads', 'url' => '/projects?type=roads',
                'photo' => 'road-paving', 'photo_alt' => 'Asphalt being laid on a highway'],
            ['name' => "Water\n& Sewerage", 'icon' => 'water', 'url' => '/projects?type=water_sewerage',
                'photo' => 'sewer-works', 'photo_alt' => 'Workers laying a large sewer pipe in a trench'],
            ['name' => "Design\n& Build", 'icon' => 'design', 'url' => '/projects?type=design_build',
                'photo' => 'pipeline-forest', 'photo_alt' => 'A large pipeline under construction through forest'],
            ['name' => "Building\nConstruction", 'icon' => 'building', 'url' => '/projects?type=civil_building',
                'photo' => 'steel-frame', 'photo_alt' => 'The steel frame of a building under construction'],
        ];
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
