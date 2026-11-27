# Fonctionnalités de Coâ Coâ Express

## Gameplay

- ✅ Traversée en deux temps : route (véhicules) puis rivière (rondins, tortues, alligators)
- ✅ **Les voitures tuent réellement au contact** (bug majeur corrigé, voir todo.md)
- ✅ **Rater un nénuphar à l'arrivée coûte réellement une vie** (bug majeur corrigé)
- ✅ Tortues qui plongent périodiquement, alligators à gueule piégeuse
- ✅ 6 nénuphars à remplir pour terminer un niveau, difficulté croissante ensuite
- ✅ Combos et bonus de temps à chaque nénuphar rempli
- ✅ Vie supplémentaire tous les 3000 points
- ✅ Mouches dorées : à la langue (à distance) ou par contact simple
- ✅ 10 thèmes visuels qui défilent d'un niveau à l'autre
- ✅ Meilleur score sauvegardé en `localStorage`

## Interface

- ✅ HUD : score, record, vies, niveau, nom du thème, barre de temps
- ✅ Écrans d'accueil, pause implicite (message), mort, victoire de niveau
- ✅ Effets : éclaboussures, étincelles, débris, fumée, pluie (thème orageux), textes
  flottants de score
- ✅ Musique chiptune procédurale qui accélère quand le temps presse
- ✅ Aucun débordement horizontal en 390×844

## Technique

- ✅ Build en un seul fichier (~275 Ko), fonctionne hors ligne
- ✅ TypeScript strict
- ✅ Logique de jeu en réducteur pur (`useGameLoop.ts`), testable en manipulant l'état
  réel du jeu en cours depuis l'extérieur — c'est ce qui a permis de vérifier les deux
  correctifs sans dépendre du timing d'une vraie partie jouée au clavier
- ✅ Bloc SEO complet, favicon, og-image (capture réelle du jeu)
- ⬜ Pas de tests automatisés embarqués
