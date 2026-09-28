function ModulePage({ title, description, children }) {
  return (
    <section className="module-page">
      <header className="module-page__header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </header>

      <div className="module-page__content">
        {children}
      </div>
    </section>
  )
}

export default ModulePage