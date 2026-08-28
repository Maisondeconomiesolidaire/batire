/**
 * Arborescence du catalogue, sur trois niveaux : catégorie → famille →
 * sous-famille. Reprise du référentiel métier, elle est la même côté backend
 * (`convex/batire.ts`) : c'est elle qui valide les fiches et borne l'IA.
 *
 * 15 catégories · 114 familles · 578 sous-familles.
 */
export type Taxonomy = Record<string, Record<string, string[]>>;

export const TAXONOMY: Taxonomy = {
  "Équipement de protection, sécurité": {
    "Vêtements & pantalon de travail": [
      "Pantalons",
      "Sweat",
      "Gilets",
      "Veste Softshell",
      "Polaires",
      "Manteaux",
      "Vêtements de pluie",
      "Vêtements à usage unique",
      "Ceintures",
      "Bonnet",
      "Genouillères"
    ],
    "Harnais & kit antichute": [
      "Harnais",
      "Kits anti-chute",
      "Anti-chute",
      "Lignes de vie",
      "Longes",
      "Connecteurs"
    ],
    "Chaussures de sécurité, chaussettes": [
      "Chaussures de sécurité pour homme",
      "Lacets",
      "Chaussettes"
    ],
    "Gants de protection": [
      "Gants de manutention générale",
      "Gants de manutention de précision"
    ]
  },
  "Matériel de chantier": {
    "Bétonnières & accessoires": [
      "Bétonnière",
      "Accessoires pour bétonnières",
      "Accessoires pour bétonnière"
    ],
    "Protection de chantier": [
      "Adhésif de signalisation",
      "Panneaux de signalisation",
      "Traceurs chantier",
      "Equipement chantier",
      "Equipement Parking",
      "Equipement de voirie",
      "Mobilier Urbain",
      "Equipement pour collectivités",
      "Balisage, Piquets",
      "Bâches, films"
    ],
    "Accès, travail en hauteur": [
      "Marchepieds, escabeaux",
      "Plates-formes",
      "Echelles",
      "Echafaudage & accessoires",
      "Echafaudage",
      "Accessoires echafaudage"
    ],
    "Téléphones, tablettes de chantier & accessoires": [
      "Accessoires smartphone",
      "Smartphones et tablettes"
    ],
    "Diables, transpalettes": [
      "Diables, tranpalettes"
    ],
    "Compresseurs & accessoires": [
      "Compresseurs & accessoires"
    ],
    "Aménagement et équipement d'atelier": [],
    "Vibration, décapage & compactage béton": [],
    "Chauffage & traitement de l'air": [
      "Canon à air chaud, radiant gaz",
      "Ventilateur, extracteur air"
    ],
    "Nettoyage de chantier": [],
    "Alimentation et éclairage de chantier": [
      "Groupes électrogènes & accessoires",
      "Alimentation électrique",
      "Eclairage de chantier"
    ],
    "Confort du chantier": [
      "Sac de charbon",
      "Jerricans",
      "Sel de déneigement",
      "Granulés bois, allume feux, sac bûches",
      "Bûche de ramonage",
      "Graisse",
      "Gaz pour camping"
    ]
  },
  "Bois et panneaux": {
    "Panneau et dalle bois brut": [
      "Panneau contreplaqué",
      "Panneau et dalle OSB (plaque)",
      "Panneau et dalle particules (aggloméré)",
      "Panneau MDF",
      "Panneau lamellé-collé et panneau 3 plis",
      "Panneau technique Construction ossature bois",
      "Panneau PVC expansé"
    ],
    "Panneau décoratif, menuiserie et agencement": [
      "Panneau mélaminé",
      "Panneaux stratifiés",
      "Panneau PVC expansé",
      "Tablette mélaminé",
      "Bande de chant",
      "Essences fines",
      "Plan de travail bois",
      "Placage"
    ],
    "Bois de construction": [
      "Bois de charpente",
      "Bois de couverture",
      "Montant d'ossature bois",
      "Bois massif reconstitué",
      "Bois de chauffage"
    ],
    "Bois de coffrage": [
      "Bastaing de coffrage",
      "Chevron de coffrage",
      "Madrier de coffrage",
      "Piquet",
      "Planche de coffrage",
      "Planche rouge",
      "Plateau maçon"
    ],
    "Bois de menuiserie": [
      "Plot de bois",
      "Bois de menuiserie brute",
      "Carrelets menuiserie",
      "Lames à volet, barres, écharpes"
    ]
  },
  "Portes, fenêtres, menuiserie": {
    "Portes d'intérieur, bloc-portes": [
      "Portes d'intérieur, bloc-portes Déco",
      "Portes d'intérieur, bloc-portes planes",
      "Portes d'intérieur, bloc-portes techniques"
    ],
    "Huisseries": [
      "Huisseries/batis bois",
      "Autres produits - Huisseries C/CC",
      "Huisseries fin de chantier et C/CC"
    ],
    "Placards, dressing": [
      "Aménagement de placard",
      "Portes de placard",
      "Séparation de pièces"
    ],
    "Grilles, stores, marquises": [
      "Balconnet",
      "Grilles de défense et gardes corps",
      "Marquises",
      "Stores et occultations"
    ],
    "Portes d'entrée et de service": [
      "Portes d'entrée",
      "Portes de service"
    ],
    "Portes coulissantes, systèmes coulissants": [
      "Systèmes coulissants en applique",
      "Systèmes coulissants à galandage",
      "Accessoires pour systèmes coulissants"
    ],
    "Escaliers et échelles": [
      "Accessoires escaliers",
      "Echelles",
      "Escaliers"
    ],
    "Fenêtres de toit (Velux et et autres marques)": [
      "Fenêtres de toit (Velux et autres marques) dimensions standard",
      "Fenêtres de toit (Velux et autres marques) hors dimensions standard",
      "Fenêtres pour toit plat",
      "Fenêtres pour verrières",
      "Fenêtres zinc",
      "Meneaux pour fenêtres patrimoine",
      "Rénovation de fenêtres de toit",
      "Châssis",
      "Commandes électriques fenêtres de toit",
      "Pièces détachées fenêtres de toit",
      "Accessoires communs fenêtres de toit",
      "Isolation pour fenêtres de toit"
    ],
    "Tertiaire": [
      "Porte grand passage"
    ],
    "Volets": [
      "Volets roulants",
      "Volets battants",
      "Volets coulissants",
      "Persiennes",
      "Coffres de volets roulants"
    ],
    "Portes de garage": [
      "Portes de garage basculantes",
      "Portes de garage sectionnelles",
      "Portes de garage à enroulement",
      "Motorisation de portes de garage",
      "Accessoires portes de garage",
      "Abris et carport"
    ],
    "Fenêtres et portes-fenêtres sur mesure": [
      "Fenêtres et porte-fenêtres PVC",
      "Fenêtres et porte-fenêtres aluminium",
      "Fenêtres et porte-fenêtres bois",
      "Fenêtres et porte-fenêtres mixtes aluminium bois",
      "Formes particulières (demi-lune, oeil de boeuf)",
      "Accessoires pour fenêtres et portes-fenêtres"
    ],
    "Portails": [
      "Portails en aluminium",
      "Portails en PVC",
      "Portails composites",
      "Automatismes de portails",
      "Portillons"
    ]
  },
  "Terrasses et extérieurs": {
    "Terrasse bois, carrelage, sol extérieur": [
      "Terrasse bois",
      "Carrelage extérieur (terrasse, piscine)",
      "Dalles pierre reconstituée, béton ou terre cuite",
      "Dalles pierre naturelle",
      "Dalles gazon et graviers",
      "Pavés béton et pierre naturelle",
      "Agrégats décoratifs"
    ],
    "Clôtures": [
      "Clôtures bois, béton, métal",
      "Grillage et occultation",
      "Chaperons, chapeaux et piliers béton, pierre reconstituée et aluminium",
      "Garde-corps et balustrades"
    ],
    "Produits de mise en oeuvre extérieur": [
      "Produits de mise en oeuvre aménagement extérieur",
      "Produits de mise en oeuvre terrasses bois",
      "Accessoires dalles et pavés",
      "Accessoires clôtures",
      "Accessoires grillage",
      "Accessoires garde-corps",
      "Accessoires parements",
      "Produits d'entretien et de traitement"
    ],
    "Entretien de piscine": [
      "Produits de traitement et accessoires piscine",
      "Pompes et matériel électrique",
      "Liner et pvc armé",
      "Peinture et enduit piscine"
    ],
    "Murs extérieurs": [
      "Plaquettes de parement",
      "Gabion",
      "Murs et blocs végétalisables"
    ],
    "Décoration du jardin": [
      "Mobilier de jardin",
      "Bordures",
      "Pas japonais",
      "Galets et gravillons pour le jardin",
      "Traverses",
      "Eclairage de jardin",
      "Palis et piquets"
    ],
    "Portails": [
      "Portails en aluminium",
      "Portails en PVC",
      "Portails composites",
      "Automatismes de portails",
      "Portillons"
    ]
  },
  "Salle de bain, WC, sanitaires": {
    "Meubles salle de bain": [
      "Meuble vasque salle de bain",
      "Meuble rangement salle de bain",
      "Meuble lave-main",
      "Miroir et armoire de toilette",
      "Accessoires salle de bain",
      "Meubles Salle de bain"
    ],
    "Robinetterie": [
      "Kit de douche encastrable",
      "Robinets pour douche",
      "Robinets pour baignoire",
      "Robinets pour lavabo",
      "Robinets techniques",
      "Vidage et siphon"
    ],
    "Douche": [
      "Cabine de douche",
      "Colonne de douche",
      "Paroi de douche",
      "Receveur de douche",
      "Barre et pommeau de douche",
      "Accessoires de douche"
    ],
    "Cuisine": [
      "Meuble sous évier",
      "Evier",
      "Robinets évier de cuisine"
    ],
    "Lavabo et vasque": [
      "Lavabo",
      "Vasque",
      "Lave-main"
    ],
    "WC": [
      "Packs WC",
      "WC suspendus",
      "Bidet, urinoir",
      "Accessoires WC",
      "Robinetterie WC",
      "Chasse d'eau",
      "Réservoir",
      "Broyeurs"
    ],
    "Collectivité": [
      "WC collectivité",
      "Robinetterie de collectivité"
    ]
  },
  "Autres revêtements sol et mur": {
    "Parquet": [
      "Parquet massif",
      "Parquet contrecollé"
    ],
    "Vinyles (PVC, lino)": [
      "Sol PVC imitation parquet ou bois en lame",
      "Sol PVC imitation carrelage ou béton",
      "Sol PVC autres décors",
      "Sols Vinyles à la coupe",
      "Revêtement minéral composite"
    ],
    "Plinthes et accessoires autres revêtements": [
      "Plinthes et accessoires sol stratifié",
      "Plinthes et accessoires sol PVC",
      "Plinthes et accessoires parquet contrecollé",
      "Plinthes bois",
      "Plinthes blanches",
      "Plinthes alu",
      "Accessoires de pose parquet massif"
    ],
    "Sol stratifié": [
      "Sol stratifié bois foncé",
      "Sol stratifié bois naturel",
      "Sol stratifié bois gris",
      "Sol stratifié bois blanchi",
      "Sol stratifié pierre"
    ],
    "Moquette et fibres naturelles": [
      "Jonc de mer",
      "Moquette",
      "Sisal"
    ],
    "Lambris": [
      "Lambris bois",
      "Lambris PVC",
      "Accessoires lambris PVC"
    ],
    "Produits de mise en œuvre intérieur": [
      "Préparation des sols",
      "Isolation phonique sol",
      "Colle (parquet, sol souple)",
      "Nez de marche, profilés, barres de seuil",
      "Tasseaux et moulures",
      "Produits d'entretien et de traitement",
      "Trappes, couvercles, divers",
      "Confort et accessibilité"
    ]
  },
  "Carrelage intérieur": {
    "Carrelage sol intérieur": [
      "Carrelage imitation pierre",
      "Carrelage imitation béton",
      "Carrelage imitation parquet ou bois",
      "Carrelage imitation marbre",
      "Carrelage hexagonal",
      "Carrelage uni",
      "Carrelage décor",
      "Carrelage sol grand format",
      "Carrelage technique"
    ],
    "Carrelage mur salle de bain, crédence cuisine, faïence": [
      "Carrelage mur uni",
      "Carrelage mur imitation pierre",
      "Carrelage mur imitation béton",
      "Carrelage mur motifs",
      "Carrelage métro",
      "Carrelage mur imitation bois",
      "Carrelage mur imitation marbre",
      "Carrelage mur hexagonal"
    ],
    "Carrelage grand format et XXL": [
      "Carrelage grand format et XXL imitation pierre",
      "Carrelage grand format et XXL imitation béton",
      "Carrelage grand format et XXL imitation bois",
      "Carrelage grand format et XXL imitation marbre",
      "Carrelage grand format et XXL uni et décor"
    ],
    "Plinthes et accessoires carrelage": [
      "Plinthes et accessoires sol effet béton",
      "Plinthes et accessoires sol effet pierre",
      "Plinthes et accessoires sol effet uni",
      "Plinthes et accessoires sol effet bois",
      "Plinthes et accessoires carrelage technique",
      "Plinthes et accessoires sol effet marbre"
    ],
    "Mosaïque, galet, listel": [
      "Mosaïque",
      "Listel",
      "Galet"
    ],
    "Carreaux ciment": [
      "Carreaux de ciment",
      "Imitation carreaux de ciment"
    ],
    "Produits de mise en oeuvre carrelage": [
      "Colles à carrelage",
      "Etanchéité sous carrelage",
      "Croisillons",
      "Joint carrelage"
    ]
  },
  "Toiture": {
    "Tuiles": [
      "Tuiles terre cuite",
      "Tuiles béton",
      "Tuiles de verre",
      "Fixations des tuiles",
      "Accessoires tuiles"
    ],
    "Etanchéité, traitement de toiture": [
      "Etanchéité bitume",
      "Etanchéité synthétique",
      "Etanchéité liquide",
      "Etanchéité toits plats",
      "Accessoires communs d'étanchéité",
      "Traitement de toiture"
    ],
    "Fenêtres de toit (Velux et autres marques)": [
      "Fenêtres de toit (Velux et autres marques) dimensions standard",
      "Fenêtres de toit (Velux et autres marques) hors dimensions standard",
      "Fenêtres pour toit plat",
      "Fenêtres pour verrières",
      "Fenêtres zinc",
      "Meneaux pour fenêtres patrimoine",
      "Rénovation de fenêtres de toit",
      "Châssis",
      "Commandes électriques fenêtres de toit",
      "Pièces détachées fenêtres de toit",
      "Accessoires communs fenêtres de toit",
      "Isolation pour fenêtres de toit"
    ],
    "Conduits de fumée et tubage": [
      "Aération & désenfumage",
      "Fumisterie"
    ],
    "Ardoises, bardeaux": [
      "Ardoises naturelles",
      "Ardoises manufacturées",
      "Fixations ardoises",
      "Bardeaux",
      "Accessoires pour ardoises et bardeaux"
    ],
    "Gouttières, zinguerie": [
      "Gouttières et descentes zinc",
      "Gouttières et descentes PVC",
      "Gouttières galvanisées",
      "Gouttières et descentes cuivre",
      "Gouttières et descentes inox",
      "Evacuation d'eau de pluie pour toit plat (boîtes à eaux)",
      "Accessoires communs gouttières et descentes"
    ],
    "Photovoltaïque": [],
    "ITE, isolation des toitures": [
      "Sarking",
      "Caissons chevronnés",
      "Panneaux sandwich",
      "Accessoires ITE toiture"
    ],
    "Toitures métalliques": [
      "Bacs acier",
      "Toitures en cuivre",
      "Toitures en inox",
      "Toitures en zinc",
      "Toitures en plomb",
      "Toitures aluminium",
      "Fixations toitures métalliques",
      "Joints d'étanchéité toitures métalliques"
    ],
    "Composants de toiture": [
      "Abergement",
      "Accessoires d'égoût",
      "Bandes d'étanchéité",
      "Closoirs de faîtage",
      "Ecrans sous toiture",
      "Noues",
      "Pare-pluie",
      "Ornements",
      "Solins d'abergement",
      "Dispositifs arrêt neige",
      "Anti oiseaux"
    ],
    "Bardage, clins, panneaux": [
      "Bardage bois",
      "Bardage fibre-ciment",
      "Bardage PVC",
      "Bardage fibre de bois",
      "Bardage bois composite",
      "Bardage compact HPL"
    ],
    "Plaques de toiture": [
      "Plaques support de tuile",
      "Plaques ondulées grandes ondes",
      "Plaques ondulées petites ondes",
      "Plaques planes"
    ],
    "Bandeau de rive et sous-face": [
      "Planche de rive Bois",
      "Bandeaux de rive PVC - Accessoires",
      "Lambris Sous-face Bois",
      "Lambris Sous-face PVC",
      "Autres produis planches/bandeaux de rives",
      "Protège panne"
    ]
  },
  "Plâtre, isolation, plafonds": {
    "Plaques de plâtre et cloisons": [
      "Plaques de plâtre standard (BA13, BA15...)",
      "Plaques hydrofuges & environnement très humide",
      "Plaques acoustiques",
      "Plaques plafond",
      "Plaques pré-peintes",
      "Plaques feu",
      "Plaques haute dureté, sol et renforcées",
      "Plaques air pur",
      "Plaques multifonctions",
      "Carreaux de plâtre,terre cuite, béton cellulaire, autres cloisons"
    ],
    "ITI ( Isolation Thermique par l'Intérieur)": [
      "Doublage collé PSE",
      "Doublage collé laine minérale",
      "Doublage collé polyuréthane",
      "Laine de verre mur",
      "Laine de roche mur",
      "Panneaux polystyrène",
      "Polyuréthane mur",
      "Isolants alvéolaires",
      "Laine minérale ossature bois",
      "Isolant sous vide",
      "Accessoires ITI"
    ],
    "Plafonds": [
      "Dalles plafonds",
      "Ossatures plafonds",
      "Plaques pour plafond",
      "Accessoires plafonds",
      "Trappes plafonds",
      "Isolation plafonds",
      "Autres dalles de plafond"
    ],
    "Isolation phonique des murs": [
      "Laine de verre acoustique standard largeur 600mm",
      "Laine de verre acoustique technique largeur 900mm",
      "Laine de roche acoustique",
      "Isolants biosourcés pour cloisons",
      "Autres produits - Pour cloison",
      "Laine minérale acoustique",
      "Doublage mince acoustique"
    ],
    "Plâtres, enduits, mortiers": [
      "Plâtres (manuel, à projeter) et accessoires",
      "Enduits et mortiers",
      "Accessoires plâtres, enduits et mortiers"
    ],
    "Isolants biosourcés et naturels": [
      "Fibre de bois",
      "Ouate de cellulose",
      "Chanvre",
      "Ouate de polyester",
      "Laine de coton",
      "Liège",
      "Autres isolants biosourcés",
      "Accessoires isolants biosourcés"
    ],
    "Isolation des toitures": [
      "Isolation des combles",
      "Isolants minces",
      "Isolation des toits terrasses",
      "Toiture - sarking"
    ],
    "Ossatures métalliques et accessoires": [
      "Ossatures métalliques",
      "Accessoires plaques de plâtre"
    ],
    "ITE (Isolation Thermique par l'Extérieur)": [
      "ITE finition enduit",
      "ITE finition bardage - panneaux",
      "ITE sous bardage ventilé",
      "ITE : enduits de façade"
    ],
    "Isolation des sols": [
      "Polystyrène expansés sols",
      "Polystyrène extrudés sols",
      "Polyurethane sols",
      "Laine minérale sols",
      "Accessoires isolation des sols"
    ],
    "Isolation hottes et équipement thermiques industriels": [
      "Laine de verre - Lambda 40",
      "Laine de verre - Lambda 35",
      "Laine de roche - Lambda 34",
      "Polyuréthane",
      "Équipements thermiques industriels"
    ]
  },
  "Matériaux, gros oeuvre": {
    "Matériaux de construction": [
      "Blocs béton cellulaire",
      "Parpaings",
      "Briques",
      "Ciment chaux",
      "Mortiers, bétons secs, BPE",
      "Plâtres & enduits",
      "Agrégats (sable, gravier, gravillons)",
      "Aciers (treillis soudé, rond à béton, armature)",
      "Linteaux et prélinteaux",
      "Appuis de fenêtre, seuils, produits béton préfabriqués",
      "Boisseaux de cheminée",
      "Coffrage (Panneaux et carton de coffrage)",
      "Parements",
      "Etanchéité et protection",
      "Chimie du bâtiment (ragréage, mortier de réparation)"
    ],
    "Voirie, TP": [
      "Fonte de voirie",
      "Bordures et caniveaux",
      "Regards et boîtes",
      "Tuyaux, raccords et drains",
      "Géotextiles voirie TP",
      "Réseaux secs",
      "Adduction d'eau",
      "Mobilier urbain",
      "Soutènement et tallutage",
      "Produits de mise en oeuvre VRD"
    ],
    "Assainissement": [
      "Caniveaux bâtiment",
      "Drainage, épandage et filtration",
      "Equipement des sols PVC",
      "Fosses, microstations et filtres compacts",
      "Géotextiles assainissement",
      "Récupération des eaux pluviales",
      "Regards et buses d'assainissement",
      "Traitement des eaux",
      "Tubes et raccords PVC pour l'assainissement",
      "Assainissement non collectif (ANC)"
    ],
    "Planchers, dallages, chapes": [
      "Poutrelles précontraintes",
      "Entrevous (hourdis)",
      "Planelles",
      "Poutres béton",
      "Planchers collaborants",
      "Accessoires pour poutrelles",
      "Chapes allégées"
    ]
  },
  "Quincaillerie générale de bâtiment": {
    "Connecteurs metalliques": [
      "Connecteur métallique assemblage bois"
    ]
  },
  "Peinture, mastic, droguerie": {
    "Peinture": [
      "Peinture intérieure",
      "Peinture extérieure",
      "Bombe, peinture aérosol",
      "Peinture et traitement bois",
      "Peinture et traitement métal",
      "Enduis, mortier, plâtre",
      "Toile de verre"
    ],
    "Mastics, colles, mousses": [
      "Mastics, joints",
      "Colles",
      "Mousses expansives",
      "Adhésifs, rubans",
      "Pistolets mastic, calfeutrage & acccessoires"
    ],
    "Droguerie et entretien": [
      "Solvants, lessivage",
      "Eponges, chiffons, serpillères",
      "Balais, brosses, raclettes"
    ]
  },
  "Plomberie": {
    "Raccords laiton": [
      "Raccord laiton à visser",
      "Raccords automatiques"
    ],
    "Tubes et raccords PE": [
      "Tubes PE",
      "Raccords PE"
    ],
    "Accessoires plomberie": [
      "Joints plomberie",
      "Flexible",
      "Robinet d'arrêt",
      "Nourrice plomberie",
      "Manomètre, régulation de pression d'eau",
      "Collier de serrage, rosace, patte à vis",
      "Accessoires Salle de bain"
    ],
    "Accessoires chauffe-eaux": [
      "Accessoires Chauffe-eau",
      "Accessoires chaudière",
      "Accessoires radiateurs"
    ],
    "Tubes et raccords PER": [
      "Tubes PER",
      "Raccords PER"
    ],
    "Tubes et raccords PVC Evacuation d'eau": [
      "Tubes PVC",
      "Raccords PVC",
      "Colle PVC"
    ],
    "Raccordement gaz": [
      "Gaz naturel",
      "Gaz Butane",
      "Gaz Propane",
      "Accessoires gaz"
    ],
    "Tubes et raccords multicouches": [
      "Tubes multicouches",
      "Raccords multicouches"
    ],
    "Tubes et raccords cuivre": [
      "Tubes cuivre",
      "Raccords cuivre"
    ],
    "Plomberie sanitaires": [
      "Abattants WC",
      "Accessoires WC",
      "Accessoires salle de bain",
      "Accessoires robinetterie",
      "Accessoires machine à laver",
      "Accessoires de cuisine"
    ],
    "Outils du plombier": [
      "Déboucheur de canalisation",
      "Etancheité plomberie",
      "Pince à sertir, clé lavabo",
      "Coupe tube pour plombier"
    ]
  },
  "Électricité, ventilation": {
    "Radiateur électrique": [
      "Radiateur à inertie",
      "Radiateur rayonnant",
      "Thermostat",
      "Sèche-serviette"
    ],
    "Matériel électrique": [
      "Tableau électrique",
      "Coffret électrique",
      "Disjoncteur",
      "Delesteur électrique",
      "Coffret de communication",
      "Coupe circuit",
      "Interrupteur sectionneur",
      "Fusible",
      "Parafoudre",
      "Télérupteur",
      "Contacteur",
      "Répartiteur",
      "Interrupteur différentiel",
      "Déclencheur",
      "Commandes",
      "Bloc différentiel",
      "Protection modulaire - autres produits"
    ],
    "Gaines et câbles électriques": [
      "Fils et câbles électriques",
      "Goulotte électrique",
      "Gaine électrique",
      "Fixation cable électrique",
      "Borne et domino électrique",
      "Boite de dérivation",
      "Enrouleur, rallonge et multiprise",
      "Boite d'encastrement",
      "Mise à la terre",
      "Gaines et câbles électriques - autres produits"
    ],
    "Outils électricien, multimètre": [
      "Multimètre",
      "Couteau, pince, tournevis électricien",
      "Outillage de l'électricien - autres produits"
    ],
    "Eclairage": [
      "Eclairage extérieur",
      "Ampoule, lampe",
      "Starter néon et ballast",
      "Connecteur, douille et accessoires",
      "Eclairage intérieur",
      "Lampe frontale",
      "Lampe torche - baladeuse",
      "Piles",
      "Accessoires éclairage",
      "Eclairage - autres produits"
    ],
    "Domotique, connectique": [
      "Pilotage de l'éclairage",
      "Visiophone et sonnette",
      "Alarme, sécurité",
      "Sécurité et domotique - autres produits"
    ],
    "Traitement et transmission du signal": [
      "Traitement du signal"
    ],
    "Appareillage électrique": [
      "Prises électriques et interrupteurs",
      "Autres produits - Appareillage électrique",
      "Boitier électrique"
    ],
    "Ventilation": [
      "VMC",
      "Extracteurs",
      "Ventilation - autres produits"
    ]
  }
};

export const CATEGORIES = Object.keys(TAXONOMY);

export function familiesOf(category: string) {
  return Object.keys(TAXONOMY[category] ?? {});
}

export function subFamiliesOf(category: string, family: string) {
  return TAXONOMY[category]?.[family] ?? [];
}

/** Chemin complet d'une fiche, pour l'affichage : « Toiture › Tuiles › Ardoises ». */
export function taxonomyPath(category?: string, family?: string, subFamily?: string) {
  return [category, family, subFamily].filter(Boolean).join(" › ");
}
