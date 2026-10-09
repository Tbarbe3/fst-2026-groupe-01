// Applique le thème enregistré avant le premier rendu. Sans cela, le thème
// sombre par défaut s'afficherait un instant avant de basculer en clair,
// produisant un flash blanc à chaque chargement.
//
// Fichier externe et non script en ligne : la politique de sécurité de
// contenu servie par Nginx interdit `script-src 'unsafe-inline'`, ce qui
// bloquerait un script écrit dans index.html.
try {
  var stored = localStorage.getItem('codehow-theme')
  if (stored === 'light' || stored === 'dark') {
    document.documentElement.dataset.theme = stored
  }
} catch (e) {
  /* localStorage indisponible : le thème sombre par défaut s'applique. */
}
