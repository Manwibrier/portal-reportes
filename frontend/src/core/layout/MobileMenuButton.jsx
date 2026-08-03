function MobileMenuButton({ onClick, isOpen = false }) {
  return (
    <button
      type="button"
      className={`mobile-menu-button ${isOpen ? 'mobile-menu-button--open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={isOpen}
    >
      <span />
      <span />
      <span />
    </button>
  )
}

export default MobileMenuButton
