# Spécification produit — SomaneAI (version initiale)

## Vision
SomaneAI est un assistant IA entreprise « ultra-intelligent » fournissant des réponses uniques, adaptées au contexte et au domaine, sans répétition inutile, et capable de générer visualisations (graphiques, diagrammes, schémas) exploitables immédiatement.

## Objectifs prioritaires (MVP)
- Réponses textuelles concises, précises et contextualisées.
- Génération de visualisations (charts, diagrammes, arbres, gantt, flowcharts) exportables PNG/SVG/JSON.
- Adaptation par domaine (comptabilité, ventes, dev, santé) via templates de prompt et dictionnaires terminologiques.
- Mécanisme anti-répétition: varier formulation et exemples tout en restant fidèle au contenu.
- API REST/GraphQL pour intégration front/back.

## Capacités fonctionnelles
- Compréhension de requêtes en langage naturel (FR/EN).
- Réponses structurées: résumé, étapes actionnables, code exemple, et références.
- Visualisations: histogramme, courbe, donut, barres empilées, scatter, heatmap, diagramme de flux (Mermaid/Graphviz), organigramme, diagramme ER, réseau.
- Export: PNG, SVG, JSON (données + spec Vega-lite/Mermaid) et fichier téléchargeable.
- Sessions conversationnelles avec contexte et mémoire courte.
- Mode « adaptation domaine » qui injecte prompts et contraintes métiers.

## Formats de sortie
- Texte: Markdown (avec blocs de code), HTML simplifié en option.
- Visual: SVG/PNG et JSON (spec Vega-lite, Chart.js, Mermaid). 
- Code: snippets (JS/Python/SQL/Django) prêts à l'emploi.

## Interface API (extrait)
POST /api/somaneai/v1/query
- body: { "prompt": string, "mode": "chat"|"visual"|"code", "domain": string, "context": {...}, "visualSpec": {optional} }
- response: { "id": string, "text": "...", "visual": { "type":"vegalite"|"mermaid", "spec": {...}, "png_url": "..." }, "tokens": {...} }

## Prompt engineering & adaptation par domaine
- Stocker templates par domaine (variables: tone, audience, output_format, constraints).
- Pipeline prompt: (1) normaliser la requête, (2) sélectionner template, (3) injecter contexte & exemples récents, (4) appeler LLM, (5) post-process.
- Réglage du ton: professionnel, pédagogique, concis, créatif.

## Anti-répétition (comportement attendu)
- Garder un historique court des réponses fournies à l'utilisateur sur la même session.
- Varier formulation grâce à plusieurs templates paraphrasés et règles de reformulation (synonymes, restructuration, exemples différents).
- Lorsque l'utilisateur republie une question inchangée, proposer une alternative: approfondissement, approche pratique, ou visualisation.

## Génération de visualisations
- Flow:
  1. L'utilisateur demande une visualisation ou SomaneAI suggère d'en ajouter.
  2. Si données fournies: valider schéma, nettoyer, puis générer spec Vega-lite/Chart.js.
  3. Rendu côté serveur (headless) ou côté client (Vega/Chart.js), fournir SVG/PNG et spec JSON.
- Libs recommandées: Vega-Lite (spec JSON portable), Chart.js (interactif), Mermaid (diagrammes rapides), d3 pour cas complexes.

## Architecture technique (haute-niveau)
- Frontend React: composant `SomaneAIChat`, renderer pour `VisualBlock` (vega/mermaid), uploader de données.
- Backend (Django/DRF) ou microservice Node: endpoint d'orchestration, cache, stockage des assets (S3/local), gestion des clés LLM.
- LLM Adapter: couche d'abstraction vers OpenAI/Anthropic/Model local (Llama2/Alpaca++) avec fallback.
- Visualiser service: job worker qui convertit spec -> PNG/SVG (headless) et renvoie URL.
- Observabilité: logging, métriques (latence, taux d'erreur), et audit des prompts.

## Données et confidentialité
- Ne jamais envoyer de PII non nécessaire aux fournisseurs LLM (option de redaction locale).
- Option de mode "on-premise" pour les entreprises sensibles (exiger modèles locaux ou private endpoints).

## Sécurité et filtres
- Filtrage et modération des requêtes et réponses.
- Quotas par API key, throttling, journalisation des usages.

## Evaluation & qualité
- VM tests: bench latence et coût par requête.
- Tests d'acceptation par domaine: 50 prompts métiers par domaine, évaluer précision, utilité et non-répétition.
- Metrics UX: taux d'adoption des visualisations, taux d'édition des suggestions.

## MVP backlog (priorités)
1. API de chat + adaptation domaine + templates de base (compta, ventes, dev).
2. Rendu Vega-lite et export PNG/SVG.
3. Gestion session & anti-répétition basique.
4. UI React: chat + renderer visual + upload CSV.
5. Tests automatisés et documentation développeur.

## Exemples de prompts (templates)
- Résumé métier (compta): "Tu es un expert comptable. Résume en 5 points actionnables le document suivant: {{document}}. Présente en Markdown et propose 2 vérifications automatiques à faire." 
- Visual (chiffres ventes): "Génère une spec Vega-lite pour afficher les ventes mensuelles par produit à partir de ce CSV: {{csv}}. Fournis aussi un PNG et le code JS pour l'intégrer." 

## Critères d'acceptation
- Réponse textuelle adaptée au domaine > 90% satisfaction en test utilisateur.
- Visualisations générées et exportables (PNG/SVG) dans le MVP.
- Aucune réponse répétitive identique sur la même session (paraphrase ou approfondissement attendu).

---

Fichier créé: spécification initiale. Prochaine étape recommandée: concevoir l'architecture technique détaillée et un schéma d'intégration (MVP infra + endpoints).