// Catalogue des options du classeur Widget (1).xlsx, feuille Widget.
export const WIDGET_OPTION_SCHEMA = [
  {
    "number": 1,
    "widget": "monetary",
    "field_types": [
      "monetary",
      "float",
      "integer"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche une valeur monétaire avec le symbole et la précision de la devise associée",
    "options": [
      {
        "name": "currency_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Nom du champ many2one (res.currency) qui définit le symbole et la précision. Par défaut, il utilise currency_id ou la devise de l'enregistrement.",
        "source_row": 3
      },
      {
        "name": "no_symbol",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Ne jamais afficher le symbole monétaire, même en affichage en lecture seule",
        "source_row": 4
      },
      {
        "name": "hide_trailing_zeros",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Trim zéros après la dernière décimale significative : 1,20 se rend comme 1,2.",
        "source_row": 5
      },
      {
        "name": "field_digits",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Utilisez la précision décimale de la définition du champ au lieu de celle de la monnaie",
        "source_row": 6
      }
    ],
    "option_count": 4
  },
  {
    "number": 2,
    "widget": "date",
    "field_types": [
      "date"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche un sélecteur de date (calendrier) avec des limites et précisions configurables",
    "options": [
      {
        "name": "min_date",
        "type": "string",
        "input": "text",
        "location": "option",
        "description": "Date la plus ancienne sélectionnable (format ISO ou today).",
        "source_row": 7
      },
      {
        "name": "max_date",
        "type": "string",
        "input": "text",
        "location": "option",
        "description": "Date la plus récente sélectionnable (même format).",
        "source_row": 8
      },
      {
        "name": "warn_future",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche une icône d'avertissement si la date sélectionnée est dans le futur.",
        "source_row": 9
      },
      {
        "name": "min_precision",
        "type": "selection",
        "input": "select",
        "location": "option",
        "description": "Précision minimale du sélecteur : days, months, years, decades.",
        "source_row": 10,
        "choices": [
          "days",
          "months",
          "years",
          "decades"
        ]
      },
      {
        "name": "max_precision",
        "type": "selection",
        "input": "select",
        "location": "option",
        "description": "Précision maximale jusqu'à laquelle le sélecteur peut zoomer : days, months, years, decades.",
        "source_row": 11,
        "choices": [
          "days",
          "months",
          "years",
          "decades"
        ]
      },
      {
        "name": "numeric",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche la date au format numérique (ex: 31/01/2026) au lieu du format long localisé.",
        "source_row": 12
      },
      {
        "name": "placeholder_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Nom d'un champ du modèle (date ou char) dont la valeur sert de placeholder dynamique.",
        "source_row": 13
      },
      {
        "name": "start_date_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Associe ce champ comme début d'une plage de dates (le champ partenaire est injecté automatiquement).",
        "source_row": 14
      },
      {
        "name": "end_date_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Associe ce champ comme fin d'une plage de dates.",
        "source_row": 15
      },
      {
        "name": "always_range",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Lorsqu'un champ est appairé, garde l'interface de plage complète visible même si une extrémité est vid",
        "source_row": 16
      }
    ],
    "option_count": 10
  },
  {
    "number": 3,
    "widget": "datetime",
    "field_types": [
      "datetime"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche un sélecteur de date et d'heure",
    "options": [
      {
        "name": "show_time",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche ou masque la partie « heure » du champ. Par défaut à true. Mis à false, seule la date est affichée (utile pour les vues liste) .",
        "source_row": 17
      },
      {
        "name": "show_seconds",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche les secondes dans le sélecteur et le format lisible. Par défaut à false depuis Odoo 19 (il était à true en 18.0). Si activé, l'option rounding est forcée à 0 .",
        "source_row": 18
      },
      {
        "name": "rounding",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Intervalle en minutes proposé par le sélecteur d'heure. Par exemple, 15 pour des quarts d'heure. La valeur par défaut est 5 .",
        "source_row": 19
      },
      {
        "name": "min_date",
        "type": "Chaîne",
        "input": "text",
        "location": "option",
        "description": "Date la plus ancienne sélectionnable (format ISO ou today). Les dates antérieures sont grisées .",
        "source_row": 20
      },
      {
        "name": "max_date",
        "type": "Chaîne",
        "input": "text",
        "location": "option",
        "description": "Date la plus récente sélectionnable (même format que min_date) .",
        "source_row": 21
      },
      {
        "name": "warn_future",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche une icône d'avertissement si la date sélectionnée est dans le futur .",
        "source_row": 22
      },
      {
        "name": "min_precision",
        "type": "Sélection",
        "input": "text",
        "location": "option",
        "description": "Plus petite unité exigée par le sélecteur : days, months, years ou decades .",
        "source_row": 23,
        "choices": [
          "days",
          "months",
          "years",
          "decades"
        ]
      },
      {
        "name": "max_precision",
        "type": "Sélection",
        "input": "text",
        "location": "option",
        "description": "Plus grande unité jusqu'à laquelle le sélecteur peut zoomer : days, months, years ou decades .",
        "source_row": 24,
        "choices": [
          "days",
          "months",
          "years",
          "decades"
        ]
      },
      {
        "name": "numeric",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Bascule l'affichage du style lisible (Jan 31) vers le style numérique de la locale (31/01). Disponible depuis Odoo 19.0 .",
        "source_row": 25
      },
      {
        "name": "placeholder_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Nom d'un champ du même modèle fournissant un texte indicatif dynamique. Disponible depuis Odoo 19.0 .",
        "source_row": 26
      },
      {
        "name": "start_date_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Non documenté. Associe un autre champ comme début d'une plage de dates. Les deux champs sont rendus comme un seul sélecteur de plage .",
        "source_row": 27
      },
      {
        "name": "end_date_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Non documenté. Associe un autre champ comme fin de la plage. En cas de conflit avec start_date_field, seul ce dernier est utilisé .",
        "source_row": 28
      },
      {
        "name": "always_range",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Non documenté. Garde le sélecteur de plage complet visible même lorsqu'une extrémité est vide. Par défaut à false",
        "source_row": 29
      }
    ],
    "option_count": 13
  },
  {
    "number": 4,
    "widget": "float_time",
    "field_types": [
      "float"
    ],
    "views": [
      "forme",
      "liste",
      "kanban"
    ],
    "role": "Convertit un nombre flottant en affichage heures/minutes (ex: 2.5 → 02:30) .",
    "options": [
      {
        "name": "show_seconds",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche ou masque les secondes dans la valeur formatée. Remplace l'ancienne option displaySeconds d'Odoo 19 .",
        "source_row": 30
      },
      {
        "name": "unit",
        "type": "Sélection",
        "input": "text",
        "location": "option",
        "description": "Précise l'unité de temps de la valeur stockée. Permet d'indiquer au widget comment interpréter le nombre (par exemple hours, minutes ou seconds) .",
        "source_row": 31,
        "choices": [
          "hours",
          "minutes",
          "seconds"
        ]
      },
      {
        "name": "numeric",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Force l'ancien format numérique hh:mm:ss au lieu du nouveau format lisible .",
        "source_row": 32
      }
    ],
    "option_count": 3
  },
  {
    "number": 5,
    "widget": "char",
    "field_types": [
      "text",
      "char",
      "html"
    ],
    "views": [
      "forme",
      "liste",
      "kanban"
    ],
    "role": "Rendu par défaut d'un champ texte sur une seule ligne",
    "options": [
      {
        "name": "placeholder_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Affiche la valeur d'un autre champ comme texte indicatif lorsque le champ est vide .",
        "source_row": 33
      },
      {
        "name": "dynamic_placeholder",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Active le sélecteur de placeholder dynamique (non documenté, mais actif) .",
        "source_row": 34
      },
      {
        "name": "dynamic_placeholder_model_reference_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Champ de référence pour la résolution du placeholder dynamique .",
        "source_row": 35
      },
      {
        "name": "password",
        "type": "Attribut",
        "input": "text",
        "location": "attribute",
        "description": "Attribut HTML pour masquer la saisie (ex: password=\"True\") .",
        "source_row": 36
      },
      {
        "name": "autocomplete",
        "type": "Attribut",
        "input": "text",
        "location": "attribute",
        "description": "Attribut HTML pour gérer l'auto-complétion du navigateur .",
        "source_row": 37
      }
    ],
    "option_count": 5
  },
  {
    "number": 6,
    "widget": "text",
    "field_types": [
      "text",
      "char",
      "html"
    ],
    "views": [
      "forme",
      "liste",
      "kanban"
    ],
    "role": "Affiche une zone de texte multi-lignes (textarea)",
    "options": [
      {
        "name": "line_breaks",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Si false, supprime la touche Entrée et force une seule ligne (défaut : true) .",
        "source_row": 38
      },
      {
        "name": "dynamic_placeholder",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Active le sélecteur de placeholder dynamique ({{object....}}) .",
        "source_row": 39
      },
      {
        "name": "dynamic_placeholder_model_reference_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Champ de référence pour le placeholder dynamique .",
        "source_row": 40
      }
    ],
    "option_count": 3
  },
  {
    "number": 7,
    "widget": "html",
    "field_types": [
      "html"
    ],
    "views": [
      "forme",
      "liste",
      "kanban"
    ],
    "role": "Affiche un éditeur de texte riche (WYSIWYG)",
    "options": [
      {
        "name": "height",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Hauteur fixe de l'éditeur en pixels, avec défilement automatique .",
        "source_row": 41
      },
      {
        "name": "allowImage",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Autorise les images dans le dialogue média (défaut : true) .",
        "source_row": 42
      },
      {
        "name": "allowMediaDocuments",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Autorise les pièces jointes de type document (défaut : true) .",
        "source_row": 43
      },
      {
        "name": "allowVideo",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Autorise l'intégration de vidéos (défaut : true) .",
        "source_row": 44
      },
      {
        "name": "allowFile",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Autorise le téléchargement et le dépôt de fichiers (défaut : true) .",
        "source_row": 45
      },
      {
        "name": "allowChecklist",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Active le bloc de liste de contrôle interactive (défaut : true) .",
        "source_row": 46
      },
      {
        "name": "allowAttachmentCreation",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Définit allowImage et allowFile ensemble ; prioritaire sur ces deux options .",
        "source_row": 47
      },
      {
        "name": "baseContainers",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Définit les éléments blocs utilisés comme conteneurs de paragraphe .",
        "source_row": 48
      },
      {
        "name": "cleanEmptyStructuralContainers",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Supprime les conteneurs structurels vides du contenu .",
        "source_row": 49
      },
      {
        "name": "debouncePowerbuttons",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Temporise les boutons de commande slash pour la performance .",
        "source_row": 50
      },
      {
        "name": "debounceHints",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Temporise les indications de placeholder sur bloc vide .",
        "source_row": 51
      },
      {
        "name": "collaborative",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Active l'édition collaborative en temps réel .",
        "source_row": 52
      },
      {
        "name": "collaborative_trigger",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Quand rejoindre la session de synchronisation (start ou focus) .",
        "source_row": 53
      },
      {
        "name": "migrateHTML",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Exécute les migrations de version de l'éditeur au chargement (défaut : true) .",
        "source_row": 54
      },
      {
        "name": "dynamic_placeholder",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Active le placeholder dynamique pour les expressions de template .",
        "source_row": 55
      },
      {
        "name": "dynamic_placeholder_model_reference_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Champ identifiant le modèle de résolution des placeholders .",
        "source_row": 56
      },
      {
        "name": "embedded_components",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Active les blocs interactifs intégrés en rendu lecture seule (défaut : true) .",
        "source_row": 57
      },
      {
        "name": "sandboxedPreview",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Force l'aperçu dans un iframe sandboxé .",
        "source_row": 58
      },
      {
        "name": "cssReadonly",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Bundle d'assets pour le style du contenu lecture seule dans l'iframe .",
        "source_row": 59
      },
      {
        "name": "codeview",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Ajoute un bouton HTML brut, uniquement en mode développeur actif .",
        "source_row": 60
      }
    ],
    "option_count": 20
  },
  {
    "number": 8,
    "widget": "integer",
    "field_types": [
      "integer"
    ],
    "views": [],
    "role": "Affiche un nombre entier avec formatage localisé",
    "options": [
      {
        "name": "enable_formatting",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Applique les séparateurs de milliers selon la langue (par défaut : true).",
        "source_row": 61
      },
      {
        "name": "human_readable",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Compacte les grandes valeurs (ex: 500G au lieu de 500 000 000 000).",
        "source_row": 62
      },
      {
        "name": "decimals",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Nombre de décimales pour le format human_readable (par défaut : 0).",
        "source_row": 63
      },
      {
        "name": "type",
        "type": "string",
        "input": "text",
        "location": "option",
        "description": "Définit le type HTML de l'input (text ou number).",
        "source_row": 64
      },
      {
        "name": "step",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Contrôles du sélecteur pour l'input de type number.",
        "source_row": 65
      },
      {
        "name": "min",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Contrôles du sélecteur pour l'input de type number.",
        "source_row": 65
      },
      {
        "name": "max",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Contrôles du sélecteur pour l'input de type number.",
        "source_row": 65
      }
    ],
    "option_count": 7
  },
  {
    "number": 9,
    "widget": "float",
    "field_types": [
      "float"
    ],
    "views": [],
    "role": "Affiche un nombre décimal avec une précision configurable.",
    "options": [
      {
        "name": "digits",
        "type": "Tableau",
        "input": "pair",
        "location": "option",
        "description": "Précision d'affichage, ex: [16, 3] pour 3 décimales.",
        "source_row": 66
      },
      {
        "name": "min_display_digits",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Nombre minimum de décimales à conserver lors du formatage.",
        "source_row": 67
      },
      {
        "name": "hide_trailing_zeros",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Supprime les zéros après la dernière décimale significative (ex: 1.20 devient 1.2).",
        "source_row": 68
      },
      {
        "name": "human_readable",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Compacte les grands nombres (ex: 500G).",
        "source_row": 69
      },
      {
        "name": "enable_formatting",
        "type": "booléen",
        "input": "boolean",
        "location": "option",
        "description": "Désactive le formatage selon la langue locale.",
        "source_row": 70
      }
    ],
    "option_count": 5
  },
  {
    "number": 10,
    "widget": "badges_selection",
    "field_types": [
      "selection"
    ],
    "views": [],
    "role": "",
    "options": [
      {
        "name": "badge_limit",
        "type": "char",
        "input": "text",
        "location": "option",
        "description": "Affiche un menu déroulant lorsque le nombre de badges dépasse cette valeur. (par défaut : 0, signifiant illimité)",
        "source_row": 71
      },
      {
        "name": "allowed_selection_field",
        "type": "char",
        "input": "text",
        "location": "option",
        "description": "Nomme un autre champ sur le registre contenant la liste des clés de sélection à afficher. Filtrage à choix conditionnel sans Python.",
        "source_row": 72
      },
      {
        "name": "excluded_selection_field",
        "type": "char",
        "input": "text",
        "location": "option",
        "description": "L’inverse de ce qui précède : nomme un champ contenant des clés de sélection pour cacher. Utile lorsqu’il est plus facile de calculer ce qui est interdit que ce qui est autorisé.",
        "source_row": 73
      },
      {
        "name": "icon_mapping",
        "type": "char",
        "input": "text",
        "location": "option",
        "description": "associe chaque valeur de sélection à une classe d’icônes indiquée sur son badge.",
        "source_row": 74
      },
      {
        "name": "default_icon",
        "type": "char",
        "input": "text",
        "location": "option",
        "description": "icône par défaut pour les valeurs non mappées. classe d’icône de secours pour toute valeur non couverte par icon_mapping.",
        "source_row": 75
      }
    ],
    "option_count": 5
  },
  {
    "number": 11,
    "widget": "statusbar",
    "field_types": [
      "selection",
      "many2one"
    ],
    "views": [
      "form (dans <header>)"
    ],
    "role": "Affiche les étapes d'un workflow (cycle de vie) sous forme de barre horizontale dans l'en-tête du formulaire. L'étape courante est mise en évidence .",
    "options": [
      {
        "name": "clickable",
        "type": "char",
        "input": "text",
        "location": "option",
        "description": "Indique si le clic sur une étape fait passer l'enregistrement à cet état. Le clic met à jour et sauvegarde immédiatement. La valeur par défaut est true.",
        "source_row": 76
      },
      {
        "name": "fold_field",
        "type": "char",
        "input": "text",
        "location": "option",
        "description": "Nom d'un champ booléen sur le modèle de l'étape. Les étapes où ce champ est activé sont regroupées dans le menu déroulant final (similaire au repli des colonnes kanban).",
        "source_row": 77
      },
      {
        "name": "statusbar_visible",
        "type": "Attribut XML (String)",
        "input": "text",
        "location": "attribute",
        "description": "Attribut élément-champ, pas une option : valeurs de sélection séparées par virgules pour afficher en ligne. La valeur actuelle est toujours ajoutée, donc les états cachés s’affichent toujours lorsqu’ils sont actifs.",
        "source_row": 78
      }
    ],
    "option_count": 3
  },
  {
    "number": 12,
    "widget": "email",
    "field_types": [
      "char"
    ],
    "views": [
      "Forme (variante form.email)",
      "liste",
      "kanban"
    ],
    "role": "Transforme un texte en lien e-mail (mailto:) cliquable ainsi le client mail de l’utilisateur.mailto:",
    "options": [
      {
        "name": "placeholder_field",
        "type": "Nom du champ",
        "input": "text",
        "location": "option",
        "description": "lien Mailto Plus enveloppe de formulaire à guauche",
        "source_row": 79
      }
    ],
    "option_count": 1
  },
  {
    "number": 13,
    "widget": "phone",
    "field_types": [
      "char"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Transforme un texte en lien téléphonique (tel:) cliquable. un lien dans les listes, un bouton Appel sur les formulaires, et, grâce au module, un bouton SMS que vous pouvez désactiver.phonetel:sms",
    "options": [
      {
        "name": "placeholder_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Lit le texte indicatif depuis un autre champ char de l'enregistrement, au lieu d'un texte statique .",
        "source_row": 81
      },
      {
        "name": "enable_sms",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche le bouton « Envoyer un SMS » à côté du numéro. Ajouté par le module sms, il est à true par défaut .",
        "source_row": 82
      }
    ],
    "option_count": 2
  },
  {
    "number": 14,
    "widget": "url",
    "field_types": [
      "char"
    ],
    "views": [
      "form (form.url)",
      "list",
      "kanban"
    ],
    "role": "Transforme un texte en lien hypertexte cliquable (ajoute http:// si absent) .url affiche un champ char comme ancre qui s’ouvre dans un nouvel onglet en contexte lecture seule.\nLes valeurs sans schéma sont préfixées dans le href, sauf si elles commencent par une barre oblique ou un schéma ftp ; la valeur stockée reste intacte.http://",
    "options": [
      {
        "name": "website_path",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Utilise la valeur telle quelle dans le href, sans ajouter automatiquement le préfixe http://. Utile pour les chemins internes (ex: /my/orders) .",
        "source_row": 83
      },
      {
        "name": "placeholder_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Lit le texte indicatif depuis un autre champ char de l'enregistrement, au lieu d'un attribut statique",
        "source_row": 84
      },
      {
        "name": "text",
        "type": "string (attribut XML)",
        "input": "text",
        "location": "attribute",
        "description": "Remplace l'URL affichée par un texte fixe, tout en gardant le href pointant vers la valeur du champ. À placer directement sur l'élément <field>, pas dans options . Le text n'est pas une option : C'est l'erreur la plus fréquente. Il faut écrire <field name=\"website\" widget=\"url\" text=\"Mon site\"/> et non options=\"{'text': 'Mon site'}\"",
        "source_row": 85
      }
    ],
    "option_count": 3
  },
  {
    "number": 15,
    "widget": "percentage",
    "field_types": [
      "float"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche une valeur décimale sous forme de pourcentage avec le symbole %. Il interprète la valeur stockée comme une fraction (ex: 0.15 s'affiche 15%) .",
    "options": [
      {
        "name": "digits",
        "type": "Tableau [width, decimals]",
        "input": "pair",
        "location": "option",
        "description": "Précision décimale du pourcentage affiché, ex: [16, 1] pour afficher 12.5%. Peut aussi être passé comme attribut XML digits (l'attribut a priorité sur l'option) .",
        "source_row": 86
      }
    ],
    "option_count": 1
  },
  {
    "number": 16,
    "widget": "percentpie",
    "field_types": [
      "float",
      "integer"
    ],
    "views": [
      "form",
      "kanban (blocs de tableau de bord)"
    ],
    "role": "Affiche une valeur sous forme de jauge circulaire (camembert) en lecture seule, dessinée en CSS pur. Idéal pour des indicateurs de performance (KPI) bornés entre 0 et 100 .",
    "options": [
      {
        "name": "string",
        "type": "Attribut XML (String)",
        "input": "text",
        "location": "attribute",
        "description": "Seul attribut lu par le widget : définit le libellé affiché sous le cercle. Sans lui, le nom technique du champ est affiché .",
        "source_row": 88
      }
    ],
    "option_count": 1
  },
  {
    "number": 17,
    "widget": "progressbar",
    "field_types": [
      "integer",
      "float"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche une valeur numérique sous forme de barre horizontale remplie. Sans option, la valeur est lue comme un pourcentage sur 100 .",
    "options": [
      {
        "name": "max_value",
        "type": "Nom de champ (ou nombre constant)",
        "input": "number",
        "location": "option",
        "description": "Seule option conservée en Odoo 20 . Champ (ou constante) définissant le maximum, affiché sous la forme valeur / max. Par défaut : 100.",
        "source_row": 89
      }
    ],
    "option_count": 1
  },
  {
    "number": 18,
    "widget": "badge",
    "field_types": [
      "char",
      "selection"
    ],
    "views": [
      "list",
      "form (lecture seule)"
    ],
    "role": "Affiche la valeur d'un champ dans une forme arrondie (pastille), similaire à une étiquette. Le widget est purement décoratif et ne permet pas l'édition de la valeur .",
    "options": [
      {
        "name": "color_field",
        "type": "Nom de champ (option)",
        "input": "field",
        "location": "option",
        "description": "Nom d'un champ integer sur le modèle qui stocke l'index de couleur (0 à 11). Le badge prend alors la couleur correspondante (0=gris, 1=rouge, 4=bleu, 10=vert, etc.) .",
        "source_row": 90
      },
      {
        "name": "decoration-*",
        "type": "Règles JSON",
        "input": "json",
        "location": "attribute",
        "description": "Attributs de décoration appliqués conditionnellement à la ligne en vue liste (ex: decoration-success=\"state == 'done'\") pour colorer le badge selon la valeur .",
        "source_row": 91
      },
      {
        "name": "class",
        "type": "Attribut XML",
        "input": "text",
        "location": "attribute",
        "description": "Classes CSS Bootstrap appliquées au badge (ex: class=\"o_badge_custom\" ou combinaison avec invisible pour un rendu conditionnel) .",
        "source_row": 92
      }
    ],
    "option_count": 3
  },
  {
    "number": 19,
    "widget": "radio",
    "field_types": [
      "selection",
      "many2one"
    ],
    "views": [
      "form",
      "list (éditable)",
      "settings"
    ],
    "role": "Affiche toutes les valeurs possibles d'un champ sous forme de boutons radio, rendant chaque option immédiatement visible et cliquable .",
    "options": [
      {
        "name": "horizontal",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Dispose les boutons radio sur une ligne horizontale au lieu de la colonne verticale par défaut. Exemple : options=\"{'horizontal': True}\"",
        "source_row": 93
      }
    ],
    "option_count": 1
  },
  {
    "number": 20,
    "widget": "priority",
    "field_types": [
      "selection"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche une série d'étoiles pour définir un niveau d'urgence. Un clic sur une étoile sélectionne le niveau correspondant. Recliquer sur l'étoile active réinitialise la priorité au premier niveau (l'équivalent d'un \"effacer\") .  Par exemple, une sélection [('0', 'Normal'), ('1', 'Important'), ('2', 'Urgent')] affichera deux étoiles. La première valeur (0) correspond à l'état \"aucune étoile\" .",
    "options": [],
    "option_count": 0
  },
  {
    "number": 21,
    "widget": "handle",
    "field_types": [
      "integer"
    ],
    "views": [
      "list (y compris les listes one2many/many2many)"
    ],
    "role": "Affiche une icône de glisser-déposer (points de préhension) au lieu de la valeur numérique du champ. Permet à l'utilisateur de réorganiser manuellement les lignes en les faisant glisser. Le widget écrit un entier dans le champ de séquence sous-jacent pour persister le nouvel ordre .",
    "options": [],
    "option_count": 0
  },
  {
    "number": 22,
    "widget": "boolean_toggle",
    "field_types": [
      "boolean"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche une valeur booléenne sous forme d'interrupteur (switch) au lieu d'une case à cocher. Par défaut, un clic sur l'interrupteur sauvegarde immédiatement l'enregistrement complet (et non juste le champ) .",
    "options": [],
    "option_count": 0
  },
  {
    "number": 23,
    "widget": "boolean_favorite",
    "field_types": [
      "boolean"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche un champ booléen sous forme d'étoile cliquable (pleine si vrai, vide si faux). Utilisé dans le noyau pour les produits favoris, les journaux comptables ou les candidats présélectionnés .",
    "options": [],
    "option_count": 0
  },
  {
    "number": 24,
    "widget": "boolean_icon",
    "field_types": [
      "boolean"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche un booléen sous forme d'une icône unique cliquable au lieu d'une case à cocher ou d'un interrupteur. Contrairement aux autres widgets booléens, il ne sauvegarde pas immédiatement l'enregistrement : le clic met à jour la valeur, mais la sauvegarde est déléguée au formulaire (ou à la vue liste) .",
    "options": [
      {
        "name": "icon",
        "type": "String (classe d'icône)",
        "input": "text",
        "location": "option",
        "description": "Définit la classe d'icône à afficher (ex: fa-check-square-o, fa-recycle). La valeur est transmise telle quelle au template. Par défaut : une icône de case cochée .",
        "source_row": 98
      },
      {
        "name": "string",
        "type": "Attribut XML (String)",
        "input": "text",
        "location": "attribute",
        "description": "Ce n'est pas une option : c'est l'attribut standard du champ qui fournit le libellé affiché à côté de l'icône .",
        "source_row": 99
      }
    ],
    "option_count": 2
  },
  {
    "number": 25,
    "widget": "state_selection",
    "field_types": [
      "selection"
    ],
    "views": [
      "form",
      "kanban"
    ],
    "role": "Affiche un champ de sélection sous forme de pastille colorée avec un menu déroulant pour changer d'état. Les couleurs sont codées en dur pour les clés normal (gris), done (vert) et blocked (rouge) ; toute autre valeur s'affiche en gris .",
    "options": [
      {
        "name": "hide_label",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Contrôle l'affichage du texte à côté de la pastille. Piège : le libellé est masqué par défaut, même si l'option est absente. Pour l'afficher, il faut explicitement passer options=\"{'hide_label': False}\" .",
        "source_row": 100
      }
    ],
    "option_count": 1
  },
  {
    "number": 26,
    "widget": "statinfo",
    "field_types": [
      "integer",
      "float",
      "monetary",
      "char",
      "one2many",
      "many2one"
    ],
    "views": [
      "form (dans un <button class=\"oe_stat_button\">)"
    ],
    "role": "Affiche la valeur d'un champ sous forme de compteur numérique à l'intérieur d'un bouton intelligent (Smart Button). C'est le widget standard pour les boutons \"Facturé\", \"Dû\", \"Documents\", etc.",
    "options": [
      {
        "name": "label_field",
        "type": "Nom de champ (char)",
        "input": "field",
        "location": "option",
        "description": "Permet d'afficher un libellé dynamique. Le texte sous le nombre est alors lu depuis un autre champ de l'enregistrement courant au lieu d'utiliser l'attribut string statique .",
        "source_row": 101
      },
      {
        "name": "digits",
        "type": "Tableau [largeur, décimales]",
        "input": "pair",
        "location": "option",
        "description": "Définit la précision décimale pour les champs de type float (ex: [16, 1]). Peut aussi être passé comme attribut XML digits sur le champ (l'attribut a priorité) .",
        "source_row": 102
      },
      {
        "name": "hide_trailing_zeros",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Permet de supprimer les zéros inutiles après la dernière décimale significative (ex: 1.20 s'affiche 1.2) .",
        "source_row": 103
      }
    ],
    "option_count": 3
  },
  {
    "number": 27,
    "widget": "image",
    "field_types": [
      "binary (ou many2one vers un modèle avec image)"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche et permet de téléverser une image stockée dans un champ binaire. le pipeline WebP génère automatiquement cinq tailles par upload . preview_image est obligatoire sur many2one : Si vous placez le widget image sur un champ relationnel (par exemple pour afficher l'avatar d'un contact), vous devez spécifier options=\"{'preview_image': 'image_128'}\" en pointant vers le champ binaire du modèle lié. Sans cela, le widget ne peut pas s'afficher .\n\nsize est une taille maximale, pas une taille fixe : Le widget ne redimensionne jamais une image vers le haut. Une image de 50px affichée avec size: [0, 180] restera à 50px .\n\nconvert_to_webp : Cette option génère des copies JPEG pour les rapports PDF en plus des versions WebP, avec aplatissement de la transparence sur fond blanc .",
    "options": [
      {
        "name": "size",
        "type": "Tableau [largeur, hauteur]",
        "input": "pair",
        "location": "option",
        "description": "Taille maximale d'affichage. 0 signifie « non contraint ». Presets : Small [0,90], Medium [0,180], Large [0,270]. L'image n'est jamais agrandie au-delà de sa taille source .",
        "source_row": 104
      },
      {
        "name": "zoom",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Affiche un aperçu plein écran au survol de l'image .",
        "source_row": 105
      },
      {
        "name": "zoom_delay",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Délai en millisecondes avant l'apparition de l'aperçu zoom .",
        "source_row": 106
      },
      {
        "name": "convert_to_webp",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Convertit les uploads en WebP côté client et génère des copies redimensionnées. Les GIF, SVG et WebP sources ne sont pas modifiés .",
        "source_row": 107
      },
      {
        "name": "accepted_file_extensions",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Restreint le sélecteur de fichiers (ex: \".png,.svg\"). Par défaut : image/* .",
        "source_row": 108
      },
      {
        "name": "preview_image",
        "type": "Nom de champ (binary)",
        "input": "field",
        "location": "option",
        "description": "Obligatoire lorsque le widget est placé sur un many2one : sans cette option, le widget lève une erreur. Sur un champ binary, permet de pointer vers une variante plus légère (ex: image_128) .",
        "source_row": 109
      },
      {
        "name": "reload",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Rafraîchit l'URL de l'image lors des changements d'enregistrement. Mettre à False fige la première URL (utile pour les cartes kanban qui clignotent). Défaut : true .",
        "source_row": 110
      },
      {
        "name": "img_class",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Classes CSS supplémentaires sur l'élément <img>. Non documenté officiellement, lu uniquement dans extractProps",
        "source_row": 111
      }
    ],
    "option_count": 8
  },
  {
    "number": 28,
    "widget": "image_url",
    "field_types": [
      "char"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Affiche une image dont l'URL est stockée dans un champ texte. L'image est chargée directement par le navigateur depuis cette URL, sans aucun stockage ni proxy côté serveur.",
    "options": [
      {
        "name": "size",
        "type": "Tableau [largeur, hauteur]",
        "input": "pair",
        "location": "option",
        "description": "Définit la taille maximale d'affichage. 0 signifie « non contraint » (ex: [0, 90], [0, 180], [0, 270]). Les images ne sont jamais agrandies au-delà de leur taille source .",
        "source_row": 112
      },
      {
        "name": "width",
        "type": "Attribut XML (entier)",
        "input": "number",
        "location": "attribute",
        "description": "Largeur maximale en pixels. N'est lu que si l'option size est absente. L'option size a priorité sur cet attribut .",
        "source_row": 113
      },
      {
        "name": "height",
        "type": "Attribut XML (entier)",
        "input": "number",
        "location": "attribute",
        "description": "Hauteur maximale en pixels. Même logique : ignoré si size est défini .",
        "source_row": 114
      }
    ],
    "option_count": 3
  },
  {
    "number": 29,
    "widget": "binary",
    "field_types": [
      "binary"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Affiche un bouton de téléversement/téléchargement pour un fichier stocké dans un champ binaire. Le nom du fichier est lu depuis un champ char compagnon . filename est un attribut, pas une option : Il se place directement sur la balise <field> (ex: filename=\"mon_champ_nom\"), et non dans options",
    "options": [
      {
        "name": "filename",
        "type": "Attribut XML (Nom de champ)",
        "input": "field",
        "location": "attribute",
        "description": "Nomme le champ char qui contient le nom original du fichier. Sans cet attribut, le fichier téléchargé porte un nom générique .",
        "source_row": 115
      },
      {
        "name": "accepted_file_extensions",
        "type": "String (option)",
        "input": "text",
        "location": "option",
        "description": "Restreint le sélecteur de fichiers côté client (ex: '.pdf,.docx'). C'est un filtre de commodité, pas une validation serveur .",
        "source_row": 116
      }
    ],
    "option_count": 2
  },
  {
    "number": 30,
    "widget": "pdf_viewer",
    "field_types": [
      "binary (PDF stocké)"
    ],
    "views": [
      "form"
    ],
    "role": "Affiche un PDF stocké en ligne (inline) dans le formulaire, au lieu de proposer un simple lien de téléchargement. Le widget masque les boutons de téléchargement et d'impression du lecteur intégré .",
    "options": [
      {
        "name": "filename",
        "type": "Attribut XML (Nom de champ)",
        "input": "field",
        "location": "attribute",
        "description": "Nomme le champ char compagnon qui contient le nom du fichier. C'est la vraie configuration du widget .",
        "source_row": 117
      }
    ],
    "option_count": 1
  },
  {
    "number": 31,
    "widget": "many2many_binary",
    "field_types": [
      "many2many (spécifiquement vers ir.attachment)"
    ],
    "views": [
      "form"
    ],
    "role": "Affiche une zone de téléversement permettant d'ajouter plusieurs fichiers en une seule fois, et de les lier à l'enregistrement. Chaque fichier devient un enregistrement ir.attachment . Le champ many2many doit pointer vers le modèle ir.attachment",
    "options": [
      {
        "name": "accepted_file_extensions",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Filtre le sélecteur de fichiers du navigateur (ex: '.pdf,.docx'). C'est une commodité côté client, pas une validation serveur .",
        "source_row": 118
      },
      {
        "name": "number_of_files",
        "type": "Integer",
        "input": "number",
        "location": "option",
        "description": "Plafond souple : masque le bouton d'ajout une fois ce nombre de fichiers liés atteint. Les fichiers existants ne sont pas supprimés, et les écritures via API ignorent cette limite .",
        "source_row": 119
      }
    ],
    "option_count": 2
  },
  {
    "number": 32,
    "widget": "many2one_binary",
    "field_types": [
      "many2one (vers ir.attachment)"
    ],
    "views": [
      "form"
    ],
    "role": "Transforme une relation many2one vers un attachement en une zone de téléversement de fichier unique. L'utilisateur dépose un fichier au lieu de sélectionner un enregistrement d'attachement dans une liste déroulante . Le widget écrit l'ID, le nom et le mimetype de l'attachement téléversé dans le champ many2one, et remet le champ à false si l'utilisateur supprime le fichier. Le widget considère toujours le champ comme \"non vide\" (isEmpty est codé en dur à false), car c'est une cible de dépôt. La zone d'upload reste donc visible même sans fichier . En cas d'erreur serveur, le widget affiche une notification rouge avec le message d'erreur et ne modifie pas l'enregistrement .",
    "options": [
      {
        "name": "accepted_file_extensions",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Filtre le sélecteur de fichiers (ex: '.pdf,.docx'). Même logique que pour many2many_binary : commodité côté navigateur uniquement .",
        "source_row": 120
      }
    ],
    "option_count": 1
  },
  {
    "number": 33,
    "widget": "signature",
    "field_types": [
      "binary"
    ],
    "views": [
      "form"
    ],
    "role": "Affiche un pad de signature (zone de dessin) permettant à l'utilisateur de dessiner sa signature à la souris, au doigt ou au stylet. L'image est ensuite stockée en base64 dans le champ binaire .",
    "options": [
      {
        "name": "string",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Libellé du bouton. Dans le noyau, c'est « Signer ».",
        "source_row": 122
      },
      {
        "name": "signature_field",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Nom du champ binaire qui recevra l'image. Par défaut : signature. Le champ n'a pas besoin d'être présent dans la vue, le widget écrit directement dedans .",
        "source_row": 123
      },
      {
        "name": "full_name",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Nom du champ qui pré-remplit le bloc « nom » de la boîte de dialogue. Pour un many2one, c'est le display_name qui est utilisé. Une valeur vide laisse le nom par défaut .",
        "source_row": 124
      },
      {
        "name": "highlight",
        "type": "Boolean",
        "input": "boolean",
        "location": "option",
        "description": "Si true, le bouton est rendu en btn-primary (mis en évidence). Défaut : false .",
        "source_row": 125
      }
    ],
    "option_count": 4
  },
  {
    "number": 34,
    "widget": "many2many_tags",
    "field_types": [
      "many2many",
      "one2many"
    ],
    "views": [
      "form",
      "list",
      "kanban"
    ],
    "role": "Affiche les relations sous forme de pastilles (tags) compactes. Permet d'ajouter/supprimer des relations et de colorer les tags en formulaire .",
    "options": [
      {
        "name": "color_field",
        "type": "Nom de champ (integer)",
        "input": "number",
        "location": "option",
        "description": "Nom d'un champ entier sur le modèle cible (0–11) qui définit la couleur de chaque pastille .",
        "source_row": 126
      },
      {
        "name": "no_create",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Supprime toutes les options de création (saisie directe + popup). Prioritaire sur les deux suivantes .",
        "source_row": 127
      },
      {
        "name": "no_quick_create",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Supprime uniquement la création par saisie directe. Le formulaire popup reste disponible .",
        "source_row": 128
      },
      {
        "name": "no_create_edit",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Supprime uniquement l'option « Créer et modifier » (popup). La saisie directe reste possible .",
        "source_row": 129
      },
      {
        "name": "create",
        "type": "Domaine",
        "input": "json",
        "location": "option",
        "description": "Autorise conditionnellement la création selon un domaine évalué sur l'enregistrement courant .",
        "source_row": 130
      },
      {
        "name": "search_threshold",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Nombre minimum de caractères avant déclenchement de la recherche .",
        "source_row": 131
      },
      {
        "name": "placeholder_field",
        "type": "Nom de champ (char)",
        "input": "field",
        "location": "option",
        "description": "Champ de l'enregistrement courant fournissant un texte indicatif dynamique .",
        "source_row": 132
      },
      {
        "name": "create_name_field",
        "type": "Nom de champ (field name)",
        "input": "field",
        "location": "option",
        "description": "Détermine quel champ de l'enregistrement cible reçoit le texte saisi lors d'une création en ligne (quick create). Par défaut, c'est le champ name qui est utilisé",
        "source_row": 133
      },
      {
        "name": "on_tag_click",
        "type": "Sélection",
        "input": "text",
        "location": "option",
        "description": "Valeurs possibles : open_form, edit_color, etc. .Les couleurs restent visibles, mais le sélectionneur est désactivé. Cliquer sur une étiquette ouvre sa forme dans un dialogue. Ça passe avant le sélecteur de couleur.",
        "source_row": 134,
        "choices": [
          "open_form",
          "edit_color"
        ]
      }
    ],
    "option_count": 9
  },
  {
    "number": 35,
    "widget": "many2many_tags_color_dot",
    "field_types": [
      "many2many"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Affiche les tags avec un point de couleur à côté d'un libellé simple, au lieu d'une pastille pleine .",
    "options": [
      {
        "name": "can_open",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Non documenté : si vrai, un clic sur un tag ouvre son enregistrement. Sans cette option, le clic ne fait rien (défaut : false) .",
        "source_row": 135
      },
      {
        "name": "color_field",
        "type": "Nom de champ (integer)",
        "input": "number",
        "location": "option",
        "description": "Hérité de many2many_tags. Champ entier sur le modèle cible qui stocke l'index de couleur .",
        "source_row": 136
      },
      {
        "name": "tag_limit",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Hérité de many2many_tags et nouveau en Odoo 20. Affiche un compteur une fois le nombre de tags dépassé (défaut : 0, tout afficher)",
        "source_row": 137
      }
    ],
    "option_count": 3
  },
  {
    "number": 36,
    "widget": "many2one_avatar_user",
    "field_types": [
      "many2one (vers res.users)"
    ],
    "views": [
      "form",
      "list",
      "kanban",
      "activity"
    ],
    "role": "Affiche l'avatar et le nom de l'utilisateur. Un clic sur l'avatar ouvre une fenêtre de chat avec cet utilisateur .",
    "options": [
      {
        "name": "no_open",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Contrôle le lien vers l'enregistrement utilisateur. Par défaut, le lien n'est actif qu'en vue formulaire. Mettre à False pour forcer le lien en liste, True pour le désactiver partout .",
        "source_row": 138
      },
      {
        "name": "no_create",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Supprime toutes les options de création d'utilisateur .",
        "source_row": 139
      },
      {
        "name": "no_quick_create",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Supprime la création en ligne par saisie directe .",
        "source_row": 140
      },
      {
        "name": "no_create_edit",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Supprime l'option « Créer et modifier » (popup) .",
        "source_row": 141
      },
      {
        "name": "search_threshold",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Nombre minimum de caractères avant déclenchement de la recherche .",
        "source_row": 142
      },
      {
        "name": "placeholder_field",
        "type": "Nom de champ (char)",
        "input": "field",
        "location": "option",
        "description": "Champ fournissant un texte indicatif dynamique .",
        "source_row": 143
      },
      {
        "name": "can_scan_barcode",
        "type": "Booléen",
        "input": "boolean",
        "location": "option",
        "description": "Active la saisie par scanner de code-barres (non documenté, lu dans extractProps) .",
        "source_row": 144
      },
      {
        "name": "create_name_field",
        "type": "Nom de champ",
        "input": "field",
        "location": "option",
        "description": "Champ qui reçoit le texte saisi lors de la création en ligne (défaut : name) .",
        "source_row": 145
      }
    ],
    "option_count": 8
  },
  {
    "number": 37,
    "widget": "badges_many2one",
    "field_types": [
      "many2one"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Transforme un champ relationnel many2one en une rangée de badges cliquables, avec une icône par enregistrement .",
    "options": [
      {
        "name": "badge_limit",
        "type": "Nombre",
        "input": "number",
        "location": "option",
        "description": "Affiche un menu déroulant une fois le nombre de badges dépassé (défaut : 0, illimité) .",
        "source_row": 146
      },
      {
        "name": "related_icon_field",
        "type": "Nom de champ (sur le modèle cible)",
        "input": "field",
        "location": "option",
        "description": "Champ du modèle cible qui contient une classe d'icône pour chaque enregistrement. Change la stratégie de chargement de name_search à search_read .",
        "source_row": 147
      },
      {
        "name": "default_icon",
        "type": "String",
        "input": "text",
        "location": "option",
        "description": "Classe d'icône de repli utilisée lorsque related_icon_field est vide, ou pour donner la même icône à tous les badges",
        "source_row": 148
      }
    ],
    "option_count": 3
  },
  {
    "number": 38,
    "widget": "boolean_checkbox",
    "field_types": [
      "boolean"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Nouveau en Odoo 20. Force l'affichage en case à cocher classique sur toutes les tailles d'écran. Le widget boolean standard devient un toggle sur mobile en Odoo 20 .",
    "options": [],
    "option_count": 0
  },
  {
    "number": 39,
    "widget": "relative_date",
    "field_types": [
      "date",
      "datetime"
    ],
    "views": [
      "form",
      "list",
      "kanban",
      "card"
    ],
    "role": "Affiche une date relative (« Dans 3 jours », « Il y a 2 mois ») avec une gestion plus précise des seuils (évite le « mois prochain » abusif) .",
    "options": [
      {
        "name": "classes",
        "type": "Dictionnaire (classe CSS → expression)",
        "input": "json",
        "location": "option",
        "description": "Mappe une décoration CSS à une expression évaluée avec days (distance signée en jours) et l'enregistrement. Défaut : {'bf': 'days <= 0'} (gras si échéance dépassée) .",
        "source_row": 150
      }
    ],
    "option_count": 1
  },
  {
    "number": 40,
    "widget": "CopyClipboardChar",
    "field_types": [
      "char"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Affiche la valeur avec un bouton de copie dans le presse-papiers .",
    "options": [
      {
        "name": "string",
        "type": "Attribut XML",
        "input": "text",
        "location": "attribute",
        "description": "Libellé du bouton de copie (défaut : « Copy ») .",
        "source_row": 151
      },
      {
        "name": "disabled",
        "type": "Attribut XML",
        "input": "text",
        "location": "attribute",
        "description": "Expression Python pour désactiver le bouton conditionnellement .",
        "source_row": 152
      }
    ],
    "option_count": 2
  },
  {
    "number": 41,
    "widget": "CopyClipboardButton",
    "field_types": [
      "char",
      "text"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Affiche uniquement un bouton (la valeur est masquée). Copie le contenu dans le presse-papiers .",
    "options": [
      {
        "name": "btn_class",
        "type": "String (option)",
        "input": "text",
        "location": "option",
        "description": "Classe Bootstrap du bouton (ex: secondary, outline-primary). Défaut : primary .",
        "source_row": 153
      },
      {
        "name": "string",
        "type": "Attribut XML",
        "input": "text",
        "location": "attribute",
        "description": "Libellé du bouton .",
        "source_row": 154
      },
      {
        "name": "disabled",
        "type": "Attribut XML",
        "input": "text",
        "location": "attribute",
        "description": "Expression Python pour désactiver le bouton .",
        "source_row": 155
      }
    ],
    "option_count": 3
  },
  {
    "number": 42,
    "widget": "CopyClipboardURL",
    "field_types": [
      "char"
    ],
    "views": [
      "form",
      "list"
    ],
    "role": "Affiche la valeur comme un lien cliquable, avec un bouton de copie. Copie la valeur brute stockée .",
    "options": [
      {
        "name": "string",
        "type": "Attribut XML",
        "input": "text",
        "location": "attribute",
        "description": "Libellé du bouton (défaut : « Copy ») .",
        "source_row": 156
      },
      {
        "name": "disabled",
        "type": "Attribut XML",
        "input": "text",
        "location": "attribute",
        "description": "Sans effet sur cette variante (seul CopyClipboardButton l'honore) .",
        "source_row": 157
      }
    ],
    "option_count": 2
  }
];
