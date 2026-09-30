(() => {
  // Frontend y API se publican por el mismo Nginx.
  // Base vacia = mismo host/puerto desde el que se abrio el portal.
  window.__PORTAL_CONFIG__ = Object.freeze({
    API_BASE_URL: '',
  })
})()
