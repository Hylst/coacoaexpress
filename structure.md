# Structure de Coâ Coâ Express

## Arborescence

```
coa-coa-express-game-development/
├── index.html              # template Vite + bloc SEO (lang=fr)
├── package.json            # coa-coa-express v1.0.0
├── vite.config.ts          # base '/coacoaexpress/', react + tailwind + singlefile
├── tsconfig.json
├── .gitignore                 # deps, secrets, fichiers d'agents IA
├── about.md / README.md / structure.md / features.md / todo.md / changelog.md
├── og-image.png / favicon.png
├── public/
│   ├── favicon.png
│   ├── og-image.png / og-image.webp
│   └── icon.webp             # carte du menu, 128x128
└── src/
    ├── main.tsx
    ├── App.tsx
    └── game/
        ├── Frogger.tsx        # composant React : canvas, HUD, ecrans, entrees clavier
        ├── useGameLoop.ts      # LOGIQUE PURE (voir ci-dessous), reducteur + boucle rAF
        ├── constants.ts        # dimensions, vitesses, config des lignes, 10 themes
        ├── types.ts             # types partages (Frog, Vehicle, Log, GameState...)
        └── audio.ts             # synthese Web Audio (musique + SFX)
```

## `game/useGameLoop.ts` : toute la logique, en reducteur pur

`gameReducer(state, action)` traite 6 actions (`MOVE`, `TONGUE`, `TICK`, `RESET`, `START`,
`NEXT_LEVEL`). Aucune dependance au DOM a part `localStorage` (record) : c'est ce qui a
permis, pendant l'audit, d'exposer temporairement `dispatch` et l'etat courant sur
`window` pour piloter le reducteur REEL du jeu en cours depuis l'exterieur, sans etre
tributaire du timing d'un vrai clavier ni recoder une copie isolee de la logique.

### Le decoupage des lignes du plateau (`constants.ts`)

```
ligne 0        HOME_ROW    (nenuphars, colonnes impaires 1,3,5,7,9,11)
lignes 1-5     RIVER_START..RIVER_END (rondins, tortues, caimans)
ligne 6        GRASS_MID   (bande de securite)
lignes 7-11    ROAD_START..ROAD_END (route, vehicules)
ligne 12       (bande de securite avant le depart)
ligne 13       START_ROW   (depart, colonne 6 par defaut)
```

### Les deux bugs corriges pendant l'audit, et pourquoi ils passaient inapercus a la lecture rapide

- **Vehicules inoffensifs.** Le seul appel a `isOnVehicle()` vit dans
  `if (isOnLand(gy)) { if (isOnVehicle(...)) {...} }`. Mais `isOnLand()` ne listait que
  `{0, 6, 12, 13}` — **la route (7-11) n'y figurait pas**, et `ROAD_START`/`ROAD_END`
  n'etaient meme pas importes dans ce fichier. La route au sens gameplay (les voitures
  qui roulent) et la route au sens "case consideree comme du sol" par le moteur de
  collision etaient deux choses differentes. Corrige en etendant `isOnLand()` aux lignes
  `ROAD_START..ROAD_END`.
- **Rangee d'arrivee sans risque.** Atteindre `HOME_ROW` sans tomber sur un nenuphar libre
  (`isAtHome` renvoie -1) ne declenchait ni mort ni score : le bloc `if (homeIdx >= 0) {...}`
  n'avait pas de branche `else`. Comme la grenouille part sur la colonne 6 (paire) et que
  les nenuphars occupent les colonnes impaires, sauter tout droit sans jamais se decaler
  menait systematiquement dans ce trou. Corrige par un `else if (gy === HOME_ROW) { ...mort... }`.

**Ne pas retirer ce `else if`** : sans lui, la grenouille reste plantee sur la berge
indefiniment (verifie sur 120 frames simulees, soit ~2 secondes reelles, sans qu'il ne se
passe jamais rien) jusqu'a ce que le chronometre du niveau l'acheve tout seul.

## `game/Frogger.tsx`

Composant React unique qui monte `useGameLoop()`, dessine tout en Canvas 2D (route,
riviere, vehicules, rondins, tortues, caiman, grenouille, HUD, ecrans de messages) et
relaie les entrees clavier. Aucune logique de jeu n'y vit, il ne fait que lire `GameState`
et appeler `dispatch`.

## Build

`vite-plugin-singlefile` inline le JS et le CSS dans `index.html` (~275 Ko). Le `dist/`
contient en plus `favicon.png`, `og-image.png/webp` et `icon.webp` copies depuis `public/`.
`base: '/coacoaexpress/'` fait resoudre ces assets sous
`https://games.hylst.fr/coacoaexpress/`.
