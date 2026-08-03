<<<<<<< HEAD
(() => {
  // El frontend y la API se publican por el mismo Nginx.
  // Mantener vacío evita exponer el puerto interno del backend.
  window.__PORTAL_CONFIG__ = Object.freeze({
    API_BASE_URL: '',
=======
﻿(() => {
  const { protocol, hostname } = window.location

  window.__PORTAL_CONFIG__ = Object.freeze({
    API_BASE_URL: `${protocol}//${hostname}:3000`,
>>>>>>> 48ea142d92028658351fdc47bf19b51e4e43e2e7
  })
})()
