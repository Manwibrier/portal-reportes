(() => {
  // El frontend y la API se publican por el mismo Nginx.
  // Mantener vacío evita exponer el puerto interno del backend.
  window.__PORTAL_CONFIG__ = Object.freeze({
    API_BASE_URL: '',
  })
})()
