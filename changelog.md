# Changelog de Coâ Coâ Express

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage
[SemVer](https://semver.org/lang/fr/).

## [1.1.0] 2026-08-02

### Ajouté
- Modale « ℹ️ Infos » (bouton dans la barre de contrôles) expliquant la stack, les
  graphismes, la musique, les interactions (langue pour gober les mouches), l'architecture
  et les algorithmes notables (dérive sur troncs/nénuphars, noyade). Étape 15 du chantier
  de retrofit décrit dans `todo.md` racine du monorepo.

### Vérifié
- Build propre, modale testée à l'ouverture/fermeture, aucune erreur console, aucun
  débordement horizontal en 390×844.

## [1.0.0] 2026-08-01

Première version intégrable à Hylst.Games, partie d'un export brut audité puis corrigé.

### Ajouté
- Bloc SEO complet dans `index.html` (description, keywords, og, twitter, robots, canonical,
  theme-color) et `lang="fr"`
- `favicon.png` 32×32, `og-image.png` 1024×576 (capture réelle du jeu) et sa variante
  `og-image.webp`, `icon.webp` 128×128 pour la carte du menu
- `base: '/coacoaexpress/'` dans `vite.config.ts`
- La doc : `about.md`, `README.md`, `structure.md`, `features.md`, `todo.md`, `changelog.md`

### Modifié
- Renommé en **Coâ Coâ Express**. Le nom précédent, « Frogger », est une marque déposée
  (Konami). Titre affiché, titre de page, clé `localStorage` (`frogger_hs` →
  `coacoaexpress_hs`).
- `package.json` : `react-vite-tailwind` v0.0.0 devenu `coa-coa-express` v1.0.0
- Tirets longs retirés du code

### Corrigé
- **Les voitures ne pouvaient jamais tuer le joueur : toute la section route du jeu était
  inoffensive.** La détection de collision véhicule était gardée par un test qui ne
  reconnaissait pas les lignes de la route (7 à 11) comme « terre ferme » — les constantes
  correspondantes n'étaient même pas importées dans le fichier. Vérifié après correction,
  sur l'état réel du jeu en cours : une grenouille positionnée exactement sur un véhicule
  meurt désormais bien au contact.
- **Manquer un nénuphar en arrivant sur la rangée d'arrivée ne coûtait rien.** La
  grenouille démarre sur une colonne qui ne s'aligne jamais avec un nénuphar (colonnes
  paires vs. impaires) : sauter tout droit sans jamais se décaler menait systématiquement
  vers une berge sans nénuphar, où rien ne se passait, ni mort ni score, jusqu'à ce que le
  chronomètre du niveau finisse par achever la partie. Corrigé : rater l'arrivée déclenche
  désormais la même mort que tomber à l'eau, comme dans la convention du genre. Vérifié
  après correction, sur l'état réel du jeu en cours.
