import { useEffect, useState } from 'react'
import StylistSkills from './StylistSkills.jsx'
import { api } from './api.js'

const ROLE_LABELS = {
  CLIENT: 'Klientka',
  STYLIST: 'Stylistka',
  ADMIN: 'Właścicielka',
}

const EMPTY_STAFF = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'STYLIST',
}

function AdminPanel({ currentUserId, onCurrentUserChange }) {
  const [people, setPeople] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [form, setForm] = useState(EMPTY_STAFF)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ page: String(page), limit: '5' })

    api(`/api/users?${params}`)
      .then((result) => {
        if (cancelled) {
          return
        }
        setPeople(result.data)
        setTotal(result.total)
        setLimit(result.limit)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [page, reload])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function createAccount(event) {
    event.preventDefault()
    setError('')
    try {
      await api('/api/users', { method: 'POST', body: form })
      setForm(EMPTY_STAFF)
      setPage(1)
      setReload((current) => current + 1)
    } catch (createError) {
      setError(createError.message)
    }
  }

  async function changeRole(person, role) {
    setError('')
    try {
      const updated = await api(`/api/users/${person.id}`, {
        method: 'PATCH',
        body: { role },
      })
      setPeople((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      if (updated.id === currentUserId) {
        onCurrentUserChange(updated)
      }
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  async function removePerson(person) {
    if (!window.confirm(`Usunąć konto ${person.email}?`)) {
      return
    }
    setError('')
    try {
      await api(`/api/users/${person.id}`, { method: 'DELETE' })
      setReload((current) => current + 1)
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  return (
    <section className="staff">
      <form className="card" onSubmit={createAccount}>
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
            minLength={8}
          />
        </label>
        <label className="field">
          Rola
          <select name="role" value={form.role} onChange={updateField}>
            <option value="STYLIST">Stylistka</option>
            <option value="ADMIN">Właścicielka</option>
            <option value="CLIENT">Klientka</option>
          </select>
        </label>
        <button className="primary" type="submit">
          Dodaj konto
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      <ul className="people card">
        {people.length === 0 ? <li className="empty">Brak kont.</li> : null}
        {people.map((person) => (
          <li className="person" key={person.id}>
            <div>
              <p className="name">
                {person.firstName} {person.lastName}
              </p>
              <p className="email">{person.email}</p>
            </div>
            <select
              aria-label={`Rola ${person.firstName} ${person.lastName}`}
              value={person.role}
              onChange={(event) => changeRole(person, event.target.value)}
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {person.id === currentUserId ? null : (
              <button
                className="quiet"
                type="button"
                onClick={() => removePerson(person)}
              >
                Usuń
              </button>
            )}
            {person.role === 'STYLIST' ? (
              <StylistSkills stylistId={person.id} onError={setError} />
            ) : null}
          </li>
        ))}
      </ul>

      {total > limit ? (
        <div className="pager">
          <button
            className="quiet"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Poprzednia
          </button>
          <button
            className="quiet"
            type="button"
            disabled={page * limit >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            Następna
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default AdminPanel
