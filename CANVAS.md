# Canvas — modes & comportements

Comportement **désiré** de la vue canvas dans un dossier (`view=canvas`).  
Fichiers principaux : [`LargeCanvas.vue`](client/src/components/slash/LargeCanvas.vue), [`LeftToolbar.vue`](client/src/components/slash/LeftToolbar.vue), [`CanvasItemInteractive.vue`](client/src/components/slash/CanvasItemInteractive.vue), [`CanvasItem.vue`](client/src/components/slash/CanvasItem.vue).

Modes : `pan-zoom` | `select` | `draw` (toolbar gauche). Défaut : `pan-zoom`.

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
- Pas de picto d’ouverture au centre pour les **vidéos** (voir ci-dessous).
- Autres médias (image, texte, pdf, etc.) : bouton d’ouverture central (icône « ouvrir ») au survol / en pan-zoom.

### Vidéo / audio / PDF (lecture inline)

| Type | Bouton / player | Clic ailleurs |
| --- | --- | --- |
| **Vidéo** | Play custom bas à gauche (fond gris) | Ouvre le média |
| **PDF** | Play custom → charge / décharge l’iframe | Ouvre le média |
| **Audio** | Player Plyr (play + timeline) ; **play** cliquable ; **timeline** non seekable (clic = ouvrir) | Ouvre le média |

Pas de picto d’ouverture au centre pour ces types.

### Image / URL / 3D / texte

- Clic contenu (selon mode) ou bouton central → ouvrir.
- En `select` : drag / resize si sélectionné (texte : handles largeur / hauteur).

### Formes & notes canvas (`canvas_shape`, `canvas_text`)

- Pas d’ouverture média.
- `select` : sélection, drag, resize (formes).
- `draw` : création de nouvelles formes.

---

## Pointer-events (résumé technique)

| Mode | Contenu média | Bordure sélection | Bouton ouvrir / play |
| --- | --- | --- | --- |
| **pan-zoom** | `none` (sauf exclusions) | — | `auto` + `panzoom-exclude` |
| **select** | `none` | `auto` (drag / select) | play : `auto` ; ouvrir vidéo/audio/pdf : clic sans drag |
| **draw** | overlay dessin actif | — | — |

---

## Non-goals / à clarifier plus tard

- Unifier totalement l’UX ouvrir / sélectionner entre canvas et grille.
- Feedback visuel dédié « zone ouvrir » (au-delà du cursor pointer).
- En mode main : clic sans drag → ouvrir, drag → pan (sans ouvrir).
