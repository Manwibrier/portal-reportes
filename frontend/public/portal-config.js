(() => {
  const { protocol, hostname } = window.location

  window.__PORTAL_CONFIG__ = Object.freeze({
    API_BASE_URL: `${protocol}//${hostname}:3000`,
  })
})()
