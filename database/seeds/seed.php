<?php

declare(strict_types=1);

/**
 * Seed data. Every fact here comes from the Content deck in the developer brief.
 * Contract values are stored but hidden (show_value = 0) until the client agrees.
 */
function seed(PDO $pdo): void
{
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach (['project_images', 'projects', 'home_images', 'homes', 'equipment', 'supplies', 'settings'] as $table) {
        $pdo->exec("TRUNCATE TABLE `$table`");
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

    // [slug, title, client, category, role, year, year_label, value, key_facts, featured]
    $projects = [
        ['masama-mmamashia-transmission-pipeline', 'Masama to Mmamashia transmission pipeline',
            'Water Utilities Corporation', 'design_build', 'main_contractor', 2021, 'Sept 2021', 781555356.90,
            ['Length' => 'About 100 km', 'From' => 'Masama wellfield', 'To' => 'Mmamashia water treatment plant'], 1,
            'Design and construction of an approximately 100 km transmission pipeline and associated works, from the Masama wellfield to the Mmamashia water treatment plant.'],
        ['mahalapye-radisele-road-overlay', 'Mahalapye to Radisele road overlay',
            'Ministry of Transport and Communications', 'roads', 'main_contractor', 2025, '2025', 106063411.20,
            ['Overlay' => '44 km, Mahalapye to Radisele', 'Reseal' => 'Mogonye (10 km) and Tewane (6 km) access roads'], 1,
            'Asphalt overlay of the Mahalapye to Radisele road (44 km) and reseal of the Mogonye (10 km) and Tewane (6 km) access roads.'],
        ['morupule-coal-mine-clinic', 'New clinic for Morupule Coal Mine',
            'Morupule Coal Mine', 'civil_building', 'main_contractor', 2025, '2025', 12837438.45, [], 1,
            'Construction of a new clinic for Morupule Coal Mine.'],
        ['palapye-internal-roads-overlay', 'Asphalt overlay of internal roads, Palapye village',
            'Palapye District Council', 'roads', 'main_contractor', null, 'In progress, 97% complete', 14421767.22,
            ['Status' => 'In progress, 97% complete'], 0,
            'Asphalt overlay of internal roads in Palapye village.'],
        ['mochudi-malotwana-earthworks', 'Mochudi to Malotwana A1 turnoff rehabilitation, earthworks',
            'Mason Group for Kgatleng District Council', 'roads', 'subcontractor', 2023, 'Sept 2023', 8000000.00,
            ['Length' => '11 km'], 0,
            'Earthworks for the rehabilitation of the Mochudi to Malotwana A1 turnoff (11 km).'],
        ['tsau-habu-junction-overlay', 'Asphalt overlay of Tsau to Habu junction road',
            'Mason Group (Roads Department)', 'roads', 'subcontractor', 2021, 'Oct 2021', 4000000.00, [], 0,
            'Asphalt overlay of the Tsau to Habu junction road.'],
        ['mmashoro-failed-section-rehabilitation', 'Rehabilitation of failed section at Mmashoro',
            'Ministry of Transport and Communications', 'roads', 'main_contractor', 2016, 'Mar 2016', 29367403.94, [], 0,
            'Rehabilitation of a failed road section at Mmashoro.'],
        ['jwaneng-dewatering-pipeline', 'Water delivery and dewatering pipeline, Jwaneng Mine',
            'Debswana', 'design_build', 'main_contractor', 2015, '2015', 11106830.56, [], 0,
            'Design and construction of a water delivery and dewatering pipeline around the pit at Jwaneng Mine.'],
        ['gaborone-sludge-drying-beds', 'Sludge drying beds, Gaborone waterworks',
            'Water Utilities Corporation', 'design_build', 'main_contractor', 2009, '2009', 928705.37, [], 0,
            'Design, construction and commissioning of sludge drying beds at the Gaborone waterworks.'],
        ['bdc-warehouse-gaborone-west', 'Warehouse reconstruction, Gaborone West',
            'Botswana Development Corporation', 'civil_building', 'main_contractor', 2019, '2019', 49000000.00,
            ['Site' => 'Plot 25001, Gaborone West'], 0,
            'Reconstruction of a warehouse on plot 25001, Gaborone West.'],
        ['kazungula-ferry-border-external-works', 'Kazungula ferry border external works upgrade',
            'Botswana Unified Revenue Services', 'civil_building', 'main_contractor', 2012, '2012', 4425160.32, [], 0,
            'Upgrade of the external works at the Kazungula ferry border post.'],
        ['ntimbale-ablutions-sewer-upgrade', 'Ablution facilities and sewer upgrade, Ntimbale',
            'Water Utilities Corporation', 'civil_building', 'main_contractor', 2009, '2009', 710802.67, [], 0,
            'Ablution facilities and a sewer upgrade at the Ntimbale water works and staff houses.'],
        ['broadhurst-sewer-pipeline-reconstruction', 'Broadhurst sewer transfer pipeline reconstruction',
            'Water Utilities Corporation', 'water_sewerage', 'main_contractor', 2023, 'Feb 2023', 2663768.80,
            ['Pipe' => '1200 mm reinforced concrete'], 0,
            'Reconstruction of a collapsed section of the 1200 mm Broadhurst reinforced concrete sewer transfer pipeline.'],
        ['glen-valley-notwane-sewer-upgrade', 'Glen Valley wastewater plant and Notwane emergency sewer upgrade',
            'Water Utilities Corporation, under Beijing Enterprises Water Group Botswana', 'water_sewerage', 'subcontractor',
            2023, 'Mar 2023', 4489586.46, [], 0,
            'Rehabilitation of the Glen Valley wastewater treatment plant and sewer network, and the Notwane emergency sewer upgrade.'],
        ['damtshaa-stormwater-drainage', 'Stormwater drainage system, Damtshaa Mine',
            'Debswana, Orapa', 'water_sewerage', 'main_contractor', 2015, '2015', 1890644.70, [], 0,
            'A stormwater drainage system at Damtshaa Mine.'],
        ['machaneng-prisons-sewage-upgrade', 'Sewage upgrading, Machaneng prisons camp',
            'Ministry of Defence, Justice and Security', 'water_sewerage', 'main_contractor', 2013, '2013', 1731026.08, [], 0,
            'Sewage upgrading at the Machaneng prisons camp.'],
        ['molepolole-sewage-ponds', 'Molepolole sewage ponds rehabilitation and desludging',
            'Kweneng District Council', 'water_sewerage', 'main_contractor', 2011, '2011', 1884232.00, [], 0,
            'Rehabilitation and desludging of the Molepolole sewage ponds.'],
        ['francistown-sewer-cleaning', 'Sewer cleaning and associated works, Francistown',
            'City of Francistown', 'water_sewerage', 'main_contractor', 2008, '2008', 251160.25, [], 0,
            'Sewer cleaning and associated works in Francistown.'],
        ['shakawe-elevated-water-tank', 'Elevated water tank, Shakawe',
            'Botswana Power Corporation', 'water_sewerage', 'main_contractor', 2008, '2008', 352550.00,
            ['Capacity' => '21,790 L'], 0,
            'A 21,790 L elevated water tank at Shakawe.'],
        ['orapa-conveyor-relocation', 'Relocation of No. 1 plant conveyor, Orapa Mine',
            'Debswana, Orapa', 'mechanical', 'main_contractor', 2014, '2014', 883507.50, [], 0,
            'Civil works for the relocation of the No. 1 plant conveyor at Orapa Mine.'],
        ['jwaneng-discharge-chutes', 'Scrubbing fines discharge chutes, Jwaneng Mine',
            'Debswana, Jwaneng', 'mechanical', 'main_contractor', 2012, '2012', 950400.00, [], 0,
            'Fabrication and installation of scrubbing fines discharge chutes at Jwaneng Mine.'],
        ['jwaneng-mine-wide-maintenance-labour', 'Mine-wide maintenance labour, Jwaneng Mine',
            'Debswana, Jwaneng', 'mechanical', 'main_contractor', 2012, '2012', 6000000.00, [], 0,
            'Provision of labour for mine-wide maintenance at Jwaneng Mine.'],
        ['jwaneng-concrete-column-crushing', 'Crushing, scrubbing and screening of concrete columns, Jwaneng Mine',
            'Debswana, Jwaneng', 'mechanical', 'main_contractor', 2011, '2011', 970000.00, [], 0,
            'Crushing, scrubbing and screening of concrete columns at Jwaneng Mine.'],
        ['orapa-water-delivery-lines', 'Replacement of water delivery lines, Orapa Mine',
            'Debswana, Orapa', 'mechanical', 'main_contractor', 2012, '2012', 694000.00, [], 0,
            'Replacement of water delivery lines in ultra-septic treatment plant No. 2 at Orapa Mine.'],
    ];
    $stmt = $pdo->prepare(
        'INSERT INTO projects (slug, title, client_name, category, role, year, year_label, value_pula, key_facts,
            featured, summary, scope, sort, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,\'published\')'
    );
    foreach ($projects as $i => $p) {
        [$slug, $title, $client, $cat, $role, $year, $label, $value, $facts, $featured, $scope] = $p;
        $stmt->execute([$slug, $title, $client, $cat, $role, $year, $label, $value,
            json_encode($facts, JSON_UNESCAPED_UNICODE), $featured, $scope, $scope, $i]);
    }

    // Interim openly licensed photos, until the client's own project photography is approved.
    // Alt text describes what the photo shows, not the named project.
    $photos = [
        'masama-mmamashia-transmission-pipeline' => ['pipeline-trench', 'Large steel pipes laid out beside a pipeline trench'],
        'mahalapye-radisele-road-overlay' => ['road-new', 'A newly surfaced road running through open, dry countryside'],
        'morupule-coal-mine-clinic' => ['building-glass', 'A glass-fronted building under construction with tower cranes'],
        'palapye-internal-roads-overlay' => ['road-paving', 'A paving crew and roller laying fresh asphalt'],
        'mochudi-malotwana-earthworks' => ['excavator', 'An excavator moving earth on a road site'],
        'tsau-habu-junction-overlay' => ['road-paving', 'A paving crew and roller laying fresh asphalt'],
        'mmashoro-failed-section-rehabilitation' => ['road-new', 'A newly surfaced road running through open, dry countryside'],
        'jwaneng-dewatering-pipeline' => ['pipeline-forest', 'A pipeline laid along a cleared trench'],
        'gaborone-sludge-drying-beds' => ['treatment-plant', 'Tanks at a wastewater treatment works'],
        'bdc-warehouse-gaborone-west' => ['steel-frame', 'A steel-framed building going up beside a crane'],
        'kazungula-ferry-border-external-works' => ['building-site', 'A large building under construction with scaffolding and a crane'],
        'ntimbale-ablutions-sewer-upgrade' => ['sewer-works', 'Workers repairing pipes in an open street excavation'],
        'broadhurst-sewer-pipeline-reconstruction' => ['water-main', 'An excavator digging a trench for a pipe in a street'],
        'glen-valley-notwane-sewer-upgrade' => ['treatment-plant', 'Tanks at a wastewater treatment works'],
        'damtshaa-stormwater-drainage' => ['water-main', 'An excavator digging a trench for a pipe in a street'],
        'machaneng-prisons-sewage-upgrade' => ['sewer-works', 'Workers repairing pipes in an open street excavation'],
        'molepolole-sewage-ponds' => ['treatment-plant', 'Tanks at a wastewater treatment works'],
        'francistown-sewer-cleaning' => ['sewer-works', 'Workers repairing pipes in an open street excavation'],
        'shakawe-elevated-water-tank' => ['water-tower', 'An elevated water tank on a steel tower'],
        'orapa-conveyor-relocation' => ['conveyor', 'A long conveyor crossing a dry, sandy industrial site'],
        'jwaneng-discharge-chutes' => ['cutting-torch', 'Steel being cut with a gas torch in a workshop'],
        'jwaneng-mine-wide-maintenance-labour' => ['pipe-welding', 'A welder working inside a large steel pipe'],
        'jwaneng-concrete-column-crushing' => ['dump-truck', 'A tipper truck working on a construction site'],
        'orapa-water-delivery-lines' => ['water-main', 'An excavator digging a trench for a pipe in a street'],
    ];
    $ids = $pdo->query('SELECT slug, id FROM projects')->fetchAll(PDO::FETCH_KEY_PAIR);
    $stmt = $pdo->prepare('INSERT INTO project_images (project_id, path, alt, caption, sort) VALUES (?, ?, ?, ?, 0)');
    foreach ($photos as $slug => [$key, $alt]) {
        if (isset($ids[$slug])) {
            $stmt->execute([$ids[$slug], 'stock/' . $key, $alt, 'Illustrative photo']);
        }
    }

    // Concept homes from the prototype. Placeholders until the client's designs arrive.
    $homes = [
        ['the-compact', 'The Compact',
            'A one-bedroom home with open-plan living under a simple gable roof, opening onto a covered veranda.',
            1, 1, 42, null, 'plus veranda',
            ['Gable roof', 'Open-plan living', 'Covered veranda', 'Rainwater tank'],
            ['type' => 'gable', 'width' => 7.0, 'depth' => 6.0, 'veranda' => 2.2]],
        ['the-family-two', 'The Family Two',
            'An L-shaped two-bedroom home that keeps the bedrooms in their own wing, away from the living space.',
            2, 1, 76, null, 'plus veranda',
            ['L-shaped plan', 'Separate bedroom wing', 'Veranda'],
            ['type' => 'lshape', 'width' => 11.0, 'depth' => 9.0, 'veranda' => 2.0]],
        ['the-courtyard', 'The Courtyard',
            'A three-bedroom, flat-roofed home arranged around a private courtyard, with a pergola and carport.',
            3, 2, 90, null, 'plus carport',
            ['Flat roof', 'Private courtyard', 'Pergola', 'Carport'],
            ['type' => 'courtyard', 'width' => 12.0, 'depth' => 11.0, 'carport' => 3.2]],
    ];
    $stmt = $pdo->prepare(
        'INSERT INTO homes (slug, name, blurb, bedrooms, bathrooms, area_m2, outdoor_area_m2, outdoor_label, features,
            model_type, model_params, is_placeholder, sort, status)
         VALUES (?,?,?,?,?,?,?,?,?,\'procedural\',?,1,?,\'published\')'
    );
    foreach ($homes as $i => $h) {
        $stmt->execute([$h[0], $h[1], $h[2], $h[3], $h[4], $h[5], $h[6], $h[7],
            json_encode($h[8]), json_encode($h[9]), $i]);
    }

    // [group, make, model, role, quantity label]
    $equipment = [
        ['earthmoving', 'JCB', '3CX backhoe loader', 'Trenching, loading and general site work', '2 units'],
        ['earthmoving', 'JCB', 'JS305LC excavator', 'Bulk excavation and trenching', null],
        ['earthmoving', 'JCB', '432ZX loader', 'Loading and stockpiling', null],
        ['earthmoving', 'Hitachi', 'ZX200 excavator (20 ton)', 'Excavation and pipe laying', null],
        ['earthmoving', 'Hitachi', 'ZX330 excavator (33 ton)', 'Heavy excavation', null],
        ['earthmoving', 'Mini-TLB', 'Skid steer', 'Work in confined spaces', null],
        ['earthmoving', 'Hydromek', 'A4', 'Earthmoving', null],
        ['compaction', 'JCB', '260-120 roller', 'Layer works compaction', null],
        ['compaction', 'Hamm', 'GRW18 pneumatic roller', 'Asphalt and surfacing compaction', null],
        ['compaction', 'Hamm', 'HD8VV sit-on roller', 'Compaction in tight areas', null],
        ['haulage', 'Sino', 'Trucks', 'Material haulage', '3 units'],
        ['haulage', 'Hino', 'Dutro', 'Light haulage', null],
        ['haulage', 'Hino', 'Liesse', 'Crew transport', null],
        ['vehicles', 'Toyota', 'Hilux Surf', 'Field inspections and reconnaissance surveys', 'Several'],
        ['vehicles', 'Toyota', 'Hilux', 'Site vehicle', null],
        ['vehicles', 'Toyota', 'Land Cruiser', 'Off-road site and survey vehicle', null],
        ['vehicles', 'Toyota', 'DA 110', 'Site vehicle', null],
        ['vehicles', 'Toyota', 'Runx', 'Pool vehicle', null],
        ['vehicles', 'Volkswagen', 'Amarok', 'Site vehicle', null],
        ['vehicles', 'Volkswagen', 'Polo', 'Pool vehicle', null],
        ['vehicles', 'Nissan', 'UG780', 'Heavy vehicle', null],
    ];
    // Interim photos of the same type of machine, not the client's own units.
    $machinePhoto = [
        '3CX backhoe loader' => 'backhoe',
        'A4' => 'backhoe',
        'JS305LC excavator' => 'excavator',
        'ZX200 excavator (20 ton)' => 'excavator',
        'ZX330 excavator (33 ton)' => 'excavator',
        '432ZX loader' => 'wheel-loader',
        'Skid steer' => 'skid-steer',
        '260-120 roller' => 'roller',
        'GRW18 pneumatic roller' => 'roller',
        'HD8VV sit-on roller' => 'roller',
        'Trucks' => 'dump-truck',
    ];
    $stmt = $pdo->prepare(
        'INSERT INTO equipment (group_name, make, model, role, quantity_label, image_path, sort, published)
         VALUES (?,?,?,?,?,?,?,1)'
    );
    foreach ($equipment as $i => $e) {
        $photo = isset($machinePhoto[$e[2]]) ? 'stock/' . $machinePhoto[$e[2]] : null;
        $stmt->execute([$e[0], $e[1], $e[2], $e[3], $e[4], $photo, $i]);
    }

    // [category, name, description, placeholder]
    $supplies = [
        ['valves', 'Globe, gate and check valves', null, 0],
        ['valves', 'Ball and butterfly valves', null, 0],
        ['valves', 'Bellow seal and control valves', null, 0],
        ['valves', 'Safety relief and pressure relief valves', null, 0],
        ['valves', 'Cryogenic and HF acid valves', null, 0],
        ['valves', 'Steam traps and fittings', null, 0],
        ['pipes', 'HDPE pipes', null, 0],
        ['pipes', 'Galvanised steel pipes', null, 0],
        ['pipes', 'Stainless steel pipes', null, 0],
        ['pipes', 'PVC pipes', 'Shown in the company profile. Awaiting client confirmation.', 1],
        ['electric_motors', 'Electric motors', null, 0],
    ];
    $stmt = $pdo->prepare(
        'INSERT INTO supplies (category, name, description, is_placeholder, sort, published) VALUES (?,?,?,?,?,1)'
    );
    foreach ($supplies as $i => $s) {
        $stmt->execute([$s[0], $s[1], $s[2], $s[3], $i]);
    }

    $settings = [
        'address_line' => 'Plot 61047, Block 8 Industrial, Gaborone',
        'postal_address' => 'P. O. Box 1993 AAD, Gaborone, Botswana',
        'phone' => '392 3065',
        'phone_e164' => '+2673923065',
        'cell' => '72 225 339',
        'cell_e164' => '+26772225339',
        'fax' => '',
        'email_general' => 'info@evolutionengineers.co.bw',
        'email_tenders' => 'tenders@evolutionengineers.co.bw',
        'email_homes' => 'homes@evolutionengineers.co.bw',
        'emails_are_placeholders' => '1',
        'registrations_line' => 'Registered with PPADB in building construction; fencing; water engineering services; '
            . 'civil engineering, road drainage; and roads ancillary works. Tax cleared.',
    ];
    $stmt = $pdo->prepare('INSERT INTO settings (`key`, `value`) VALUES (?, ?)');
    foreach ($settings as $k => $v) {
        $stmt->execute([$k, $v]);
    }
}
