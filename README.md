# Mental Maths

Entraînement au calcul mental chronométré, inspiré de [Zetamac](https://arithmetic.zetamac.com/) et de l'esthétique de [Monkeytype](https://monkeytype.com/).

Application 100 % statique : HTML5, CSS3 et JavaScript vanilla. Aucune dépendance, aucun build, aucune ressource externe.

## Fonctionnement

La réponse est validée **dès qu'elle est correcte**, sans appuyer sur Entrée. Tant que ce qui est tapé reste un préfixe valide de la bonne réponse, la saisie continue ; dès qu'elle s'en écarte, l'erreur est signalée immédiatement.

- **Opérations** : addition, soustraction, multiplication, division, activables séparément
- **Plages de nombres** configurables pour chaque opération
- **Modes** : Facile, Moyen, Difficile, Personnalisé
- **Durées** : 30, 60, 120 ou 240 secondes
- **Combo** : répondre en moins de 2 secondes incrémente le multiplicateur de score
- **Bilan de session** : score, précision, vitesse (rép/min), combo max et détail de chaque question
- **Top 10** conservé localement (`localStorage`), et interface FR / EN

Les soustractions sont toujours à résultat positif, et les divisions toujours à quotient entier.

## Raccourcis clavier

| Touche | Action |
| --- | --- |
| `Espace` | Commencer / Recommencer |
| `Échap` | Retour aux paramètres |
| `Entrée` | Commencer / Recommencer |

## Lancer en local

Ouvrir `index.html` dans un navigateur suffit. Pour passer par un serveur local :

```bash
python -m http.server 4173
# puis http://localhost:4173
```

## Données

Aucune donnée n'est envoyée nulle part. Les scores et la langue sont stockés dans le `localStorage` du navigateur.

## Licence

MIT
