import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import logoNorte from '../../../Imagenes/NorteConectaLogo-1.png'
import norticoHero from '../../../Imagenes/Nortico-login-Holografico.png'
import { loginWithCredentials } from '../../core/services/auth'

function normalizeError(error) {
  if (!error) {
    return 'No fue posible iniciar sesión.'
  }

  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'No fue posible iniciar sesión.'
  )
}

function Login() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isDisabled = useMemo(() => {
    return (
      submitting ||
      !String(form.email || '').trim() ||
      !String(form.password || '').trim()
    )
  }, [form, submitting])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setSubmitting(true)
    setError('')

    try {
      await loginWithCredentials({
        email: form.email,
        password: form.password,
      })

      navigate('/', {
        replace: true,
      })
    } catch (loginError) {
      setError(normalizeError(loginError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-shell auth-shell--premium">
      <section className="auth-layout auth-layout--premium">
        <section className="auth-card auth-card--premium">
          <header className="auth-card__header auth-card__header--logo-first">
            <img
              src={logoNorte}
              alt="Norte Conecta"
              className="auth-card__brand-logo auth-card__brand-logo--large"
              draggable="false"
            />

            <span className="auth-card__eyebrow">Acceso seguro</span>

            <p className="auth-card__intro auth-card__intro--center">
              Ingresa con tu correo y clave del portal.
            </p>
          </header>

          {error ? (
            <div className="auth-alert" role="alert">
              {error}
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>CORREO</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="username"
                placeholder="usuario@norteconecta.net"
                required
              />
            </label>

            <label className="auth-field">
              <span>CLAVE</span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Ingresa tu clave"
                required
              />
            </label>

            <button className="auth-submit" type="submit" disabled={isDisabled}>
              {submitting ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>
        </section>

        <aside className="auth-hero-panel">
          <header className="auth-hero-panel__header auth-hero-panel__header--clean">
            <h1 className="auth-hero-panel__title-clean">
              Portal Modular de Reportes
            </h1>
          </header>

          <div className="auth-hero-visual" aria-hidden="true">
            <img
              src={norticoHero}
              alt="Análisis de datos"
              className="auth-hero-visual__mascot auth-hero-visual__mascot--holografico"
              draggable="false"
            />
          </div>

          <section className="auth-direct-access" aria-label="Accesos directos">
            <span className="auth-direct-access__title">
              Accesos directos
            </span>

            <div className="auth-direct-access__buttons">
              <a
                href="https://totalnet.norteconecta.net/TotalNet1.0/index.jsp"
                target="_blank"
                rel="noreferrer"
                className="auth-link-button"
              >
                TotalNet
              </a>

              <a
                href="https://norteconecta.net/"
                target="_blank"
                rel="noreferrer"
                className="auth-link-button"
              >
                NorteConecta
              </a>
            </div>
          </section>

          <p className="auth-hero-visual__footnote auth-hero-visual__footnote--title">
            ANÁLISIS DE DATOS
          </p>
        </aside>
      </section>
    </main>
  )
}

export default Login
