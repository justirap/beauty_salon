import { useEffect, useState } from 'react'
import AdminPanel from './AdminPanel.jsx'
import { api, getToken, setToken } from './api.js'
import './App.css'

const ROLE_LABELS = {
  CLIENT: 'Klientka',
  STYLIST: 'Stylistka',
  ADMIN: 'Właścicielka',
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
}

function App() {
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) {
      return undefined
    }

    let cancelled = false
    api('/api/auth/me')
      .then((profile) => {
        if (!cancelled) {
          setUser(profile)
        }
      })
      .catch(() => {
        setToken(null)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const body =
      mode === 'register'
        ? form
        : { email: form.email, password: form.password }

    try {
      const result = await api(path, { method: 'POST', body, auth: false })
      setToken(result.accessToken)
      setUser(result.user)
      setForm(EMPTY_FORM)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  function logout() {
    setToken(null)
    setUser(null)
    setError('')
    setForm(EMPTY_FORM)
    setMode('login')
  }

  if (loading) {
    return (
      <main className="page">
        <p className="eyebrow">Glamora</p>
        <h1>Salon kosmetyczny</h1>
      </main>
    )
  }

  if (user) {
    return (
      <main className={user.role === 'ADMIN' ? 'page panel' : 'page'}>
        <p className="eyebrow">Glamora</p>
        <h1>Witaj, {user.firstName}</h1>
        <p className="lede">Jesteś zalogowana.</p>
        <section className="card profile">
          <p className="role">{ROLE_LABELS[user.role] ?? user.role}</p>
          <p className="name">
            {user.firstName} {user.lastName}
          </p>
          <p className="email">{user.email}</p>
          <button type="button" className="primary" onClick={logout}>
            Wyloguj
          </button>
        </section>
        {user.role === 'ADMIN' ? (
          <AdminPanel currentUserId={user.id} onCurrentUserChange={setUser} />
        ) : null}
      </main>
    )
  }

  const isRegister = mode === 'register'

  return (
    <main className="page">
      <p className="eyebrow">Glamora</p>
      <h1>{isRegister ? 'Załóż konto' : 'Zaloguj się'}</h1>
      <form className="card" onSubmit={handleSubmit}>
        {error ? <p className="error">{error}</p> : null}

        {isRegister ? (
          <>
            <label className="field">
              Imię
              <input
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                required
                minLength={2}
                maxLength={60}
              />
            </label>
            <label className="field">
              Nazwisko
              <input
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                required
                minLength={2}
                maxLength={60}
              />
            </label>
          </>
        ) : null}

        <label className="field">
          E-mail
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            required
          />
        </label>
        <label className="field">
          Hasło
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            required
            minLength={isRegister ? 8 : 1}
          />
        </label>

        <button className="primary" type="submit">
          {isRegister ? 'Utwórz konto' : 'Zaloguj się'}
        </button>
        <button
          className="link"
          type="button"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register')
            setError('')
          }}
        >
          {isRegister ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Załóż je'}
        </button>
      </form>
    </main>
  )
}

export default App
