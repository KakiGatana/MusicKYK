# Sécurité

Site statique : pas de serveur, pas de compte, pas de cookie, rien n'est envoyé.

- Content-Security-Policy stricte : seuls les fichiers du site sont chargés, pas de script inline.
- Aucune ressource externe (police hébergée dans `fonts/`).
- `no-referrer`.
- Les scores et réglages sont gardés dans le navigateur et revérifiés au chargement.

GitHub Pages ne permet pas d'en-têtes HTTP personnalisés (`frame-ancestors`, HSTS).

Pour signaler un problème : onglet Security du dépôt, « Report a vulnerability ».
