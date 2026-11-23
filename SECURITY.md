# Sécurité

MusicKYK est un site **100 % statique** (HTML/CSS/JS) servi par GitHub Pages :
pas de serveur, pas de base de données, pas de compte, pas de cookie, aucune donnée envoyée.

## Mesures en place
- **Content-Security-Policy** stricte (balise `<meta>`) : seuls les fichiers du site peuvent être
  chargés ou exécutés (`default-src 'none'`, `script-src 'self'`, pas de script inline, pas d'`eval`).
- **Aucun service tiers** : polices hébergées dans `fonts/` (licence OFL), pas de CDN, pas de tracker.
  Rien ne part vers Google ou ailleurs (bon point RGPD).
- `Referrer-Policy: no-referrer`.
- Le **stockage local** (scores, réglages) est partagé par tous les sites `kakigatana.github.io/*` :
  il est donc traité comme non fiable et validé à la lecture (seules des valeurs connues sont gardées).
- Le HTML injecté par le code ne provient que de constantes internes, jamais d'une saisie.
- HTTPS servi par GitHub Pages.

## Limites connues
GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP personnalisés : `frame-ancestors`
(anti-iframe) et HSTS ne sont donc pas configurables. Sans compte ni donnée sensible, le risque est faible.

## Signaler un problème
Ouvrir une *issue* privée via l'onglet **Security → Report a vulnerability** du dépôt.
