# TODO de Coâ Coâ Express

Audit fait le 2026-08-01 sur l'export brut (`build-a-frogger-game (4).zip`), suivi d'une
passe QA navigateur (Playwright + Chromium) avec vérification réelle des deux mécaniques
de danger du jeu (route et rivière) et d'une victoire de niveau complète.

---

## ✅ Corrigé — bugs majeurs

- [x] **Les voitures ne pouvaient jamais tuer le joueur : toute la section route du jeu
  était inoffensive.** La détection de collision véhicule (`isOnVehicle`) n'est appelée
  qu'à un seul endroit, à l'intérieur d'un `if (isOnLand(gy))`. Mais `isOnLand()` ne
  reconnaissait que les lignes `GRASS_MID` (6), `START_ROW` (13), `HOME_ROW` (0) et la
  ligne 12 : **les lignes de la route elle-même (7 à 11, `ROAD_START`/`ROAD_END`)
  n'étaient jamais reconnues comme « terre ferme »**, et ces deux constantes n'étaient
  même pas importées dans `useGameLoop.ts`. Résultat : la vérification de collision ne se
  déclenchait jamais tant que la grenouille se trouvait sur la route, quelle que soit la
  position des voitures. **Vérifié dans le navigateur, sur l'état réel du jeu en cours** :
  la grenouille placée exactement sur un véhicule réel restait `alive: true` après
  plusieurs frames avant correction, `alive: false` après.
- [x] **Manquer un nénuphar en arrivant sur la rangée d'arrivée ne coûtait rien : la
  grenouille restait en sécurité indéfiniment.** La grenouille part par défaut sur la
  colonne 6 (paire) ; les nénuphars n'occupent que les colonnes impaires (1, 3, 5, 7, 9,
  11). Sauter tout droit vers le haut sans jamais se décaler amène donc systématiquement
  sur une colonne sans nénuphar, et rien dans le code ne gérait ce cas : ni mort, ni score,
  la grenouille restait juste plantée sur la berge jusqu'à ce que le chronomètre du niveau
  finisse par l'achever tout seul. Comportement contraire à la convention du genre (rater
  l'arrivée doit tuer, comme heurter un mur). Corrigé : atteindre la rangée d'arrivée hors
  d'un nénuphar libre déclenche maintenant la même mort que tomber à l'eau. **Vérifié sur
  l'état réel du jeu** : téléportation sur une case d'arrivée sans nénuphar → `alive: false`
  après quelques frames, puis réapparition normale avec une vie perdue.

## ✅ La passe QA navigateur

- [x] 0 erreur console, 0 exception non gérée, avant et après les deux correctifs
- [x] Écran d'accueil (« COÂ COÂ EXPRESS »), lancement, HUD (score, record, vies, niveau,
  thème, chronomètre)
- [x] **Mort par véhicule vérifiée réellement**, sur une voiture existante du jeu en cours
  (pas une copie isolée), avant et après correctif
- [x] **Correctif de la rangée d'arrivée vérifié réellement**, sur l'état du jeu en cours
- [x] **Victoire de niveau complète vérifiée réellement** : les 6 nénuphars remplis un par
  un (colonnes 1, 3, 5, 7, 9, 11), score qui progresse à chaque atterrissage (370 → 790 →
  1260 → 1780 → 2350 → 3470, bonus de temps et de combo inclus), écran « NIVEAU 1 ! »
  affiché avec le score final exact
- [x] Déplacement et ramassage de mouche réels au clavier (capture d'écran avec voitures,
  camions, tortues, caïman, mouche ramassée « +200 » visible à l'écran)
- [x] Viewport mobile 390×844 : aucun débordement horizontal

## Méthode de vérification

Les deux bugs vivent dans `useGameLoop.ts`, un réducteur pur (aucune dépendance DOM). Une
fois localisés par lecture du code, ils ont été vérifiés **sur l'état réel du jeu en
train de tourner dans Chromium** : `stateRef` et `dispatch` exposés temporairement sur
`window` (technique de patch réversible, retirée avant le commit), puis manipulation
directe des positions et déclenchement de `TICK`/`MOVE` réels pour observer si le
réducteur en cours d'exécution réagissait correctement — pas une copie de la logique
testée isolément. Voir aussi `structure.md`.

---

## ⬜ Idées d'amélioration

### Design mineur
- [ ] Une mouche peut être mangée soit par contact simple (marcher à proximité), soit par
  la langue (touche E/Espace, à distance) : les deux mécaniques coexistent, ce qui rend la
  langue partiellement redondante pour les mouches proches. Pas un bug, juste une
  observation de design.
- [ ] Les mouches créées par `createFlies()` ont toutes `golden: true` ; le indicateur ne
  semble avoir aucun effet différent sur le score (toujours +200) ni sur le rendu observé.

### Technique
- [ ] `isOnLand()` est un nom un peu trompeur maintenant qu'il inclut la route : la route
  est bien de la terre ferme au sens de « pas la rivière », mais le nom pourrait être
  `isOnGroundRow` ou similaire pour plus de clarté à la prochaine lecture.
- [ ] Aucun test automatisé embarqué sur le réducteur, alors qu'il s'agit de fonctions
  pures faciles à couvrir (c'est justement ce qui a permis de vérifier les deux correctifs
  sans naviguer manuellement dans le jeu).
