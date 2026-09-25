# Canvas — modes & comportements

Comportement **désiré** de la vue canvas dans un dossier (`view=canvas`).  
Fichiers principaux : [`LargeCanvas.vue`](client/src/components/slash/LargeCanvas.vue), [`LeftToolbar.vue`](client/src/components/slash/LeftToolbar.vue), [`CanvasItemInteractive.vue`](client/src/components/slash/CanvasItemInteractive.vue), [`CanvasItem.vue`](client/src/components/slash/CanvasItem.vue).

Modes : `pan-zoom` | `select` | `draw` (toolbar gauche). Défaut : `pan-zoom`.

La lecture inline vidéo / audio / PDF s’applique aussi aux vues **grille**, **timeline** et **map** (même composant `CanvasItem` ; popup map dans [`GeoMapView.vue`](client/src/components/slash/GeoMapView.vue)).

---

## Modes d’interaction

| Mode | Icône toolbar | Rôle |
| --- | --- | --- |
| **pan-zoom** | main | Naviguer : pan + zoom sur le plan. Pas de sélection / déplacement d’items. |
| **select** | curseur | Sélectionner, déplacer, redimensionner. Ouvrir un média. |
| **draw** | crayon | Dessiner des formes (`canvas_shape`) sur le plan. |

### Raccourcis

- **Espace** (maintenu, en mode `select`) → bascule temporaire en `pan-zoom` ; au relâchement, retour au mode précédent.
- **Backspace / Delete** (en `select`, hors champ texte) → supprimer la sélection.

### Multi-sélection (mode `select`)

- Clic → sélection seule (`replace`).
- ⌘ / Ctrl ou Shift + clic → ajouter à la sélection (`append`).
- Marquee (rectangle de sélection) sur le fond du canvas.
- Déplacement d’un item sélectionné → déplace toute la sélection.

---

## Comportement par type de média

### Principes communs

- **Ouvrir** = `ItemModal` (événement `canvasItem.openWithTransition`).
- Curseur **pointer** sur les zones cliquables qui ouvrent.
- Pas de picto d’ouverture au centre pour **vidéo / audio / PDF** (voir ci-dessous).
- Autres médias (image, texte, etc.) : bouton d’ouverture central (icône « ouvrir ») au survol / en pan-zoom.

### Vidéo / audio / PDF (lecture inline)

S’applique à **toutes les vues** : canvas, grille, timeline, map.

#### Règles communes

- Bouton **play toujours cliquable** (tous modes canvas, toutes vues).
- Pendant la lecture : le bouton devient un **stop carré** (bas à gauche).
- Clic sur **stop** = **arrêt + retour au début** (pas une pause).
- **Pendant la lecture : pas de déplacement** de l’item (drag désactivé volontairement).

| Type | Affichage / player | Hors lecture | En lecture |
| --- | --- | --- | --- |
| **Vidéo** | Cover, **sans chrome** player | Play bas-gauche ; clic ailleurs → ouvrir | Vidéo qui joue ; stop bas-gauche ; pas de drag |
| **Audio** | Lecteur toujours visible : **play/stop à gauche**, **timeline à droite** | Timeline **non navigable** ; clic timeline (ou zone) → ouvrir | Timeline **scrubbable** ; stop → stop + début |
| **PDF** | Preview puis iframe | Play → charge l’iframe | Iframe en **overflow scroll** ; stop → décharge l’iframe |

Pas de picto d’ouverture au centre pour ces types.

### Map

- Clic sur une pin → petite modale ancrée sur le point ([`GeoMapView.vue`](client/src/components/slash/GeoMapView.vue)).
- Affiche le média via `CanvasItem` avec **les mêmes options** play/stop / timeline / iframe que grille / timeline.

### Image / URL / 3D / texte

- Clic contenu (selon mode) ou bouton central → ouvrir.
- En `select` : drag / resize si sélectionné (texte : handles largeur / hauteur).

### Formes & notes canvas (`canvas_shape`, `canvas_text`)

- Pas d’ouverture média.
- `select` : sélection, drag, resize (formes).
- `draw` : création de nouvelles formes.

---

## Pointer-events (résumé technique)

| Mode | Contenu média | Bordure sélection | Bouton play / stop | Timeline audio |
| --- | --- | --- | --- | --- |
| **pan-zoom** | `none` (sauf exclusions) | — | `auto` + `panzoom-exclude` | idle : `none` (ouvrir) ; playing : `auto` (scrub) |
| **select** (idle) | `none` | `auto` (drag / select / ouvrir sans drag) | `auto` | `none` (clic remonte → ouvrir / drag) |
| **select** (playing) | partiel (`auto` sur scrub / iframe) | `none` (pas de drag) | `auto` | `auto` (scrub) |
| **draw** | overlay dessin actif | — | — | — |

**Audio — piège à éviter :** ne pas mettre tout `.plyr__controls` en `pointer-events: auto` au-dessus de la bordure de sélection : ça bloque le drag. Seuls play/stop (custom) et, **si playing**, la timeline scrub doivent être interactifs.

---

## Non-goals / à clarifier plus tard

- Feedback visuel dédié « zone ouvrir » (au-delà du cursor pointer).
- En mode main : clic sans drag → ouvrir, drag → pan (sans ouvrir).
