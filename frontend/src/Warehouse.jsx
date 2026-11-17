import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

const EMPTY_FORM = {
  name: '',
  stock: '',
}

function Warehouse() {
  const formRef = useRef(null)
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ page: String(page), limit: '5' })

    api(`/api/products?${params}`)
      .then((result) => {
        if (cancelled) {
          return
        }
        setProducts(result.data)
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

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      stock: String(product.stock),
    })
    setError('')
    formRef.current?.scrollIntoView({ block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function saveProduct(event) {
    event.preventDefault()
    setError('')
    const body = {
      name: form.name,
      stock: Number(form.stock),
    }

    try {
      if (editingId) {
        await api(`/api/products/${editingId}`, { method: 'PATCH', body })
      } else {
        await api('/api/products', { method: 'POST', body })
        setPage(1)
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      setReload((current) => current + 1)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Usunąć kosmetyk ${product.name}?`)) {
      return
    }
    setError('')
    try {
      await api(`/api/products/${product.id}`, { method: 'DELETE' })
      if (editingId === product.id) {
        setEditingId(null)
        setForm(EMPTY_FORM)
      }
      setReload((current) => current + 1)
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  return (
    <section className="warehouse">
      <form className="card" ref={formRef} onSubmit={saveProduct}>
        <label className="field">
          Nazwa
          <input
            name="name"
            value={form.name}
            onChange={updateField}
            required
            minLength={2}
            maxLength={80}
          />
        </label>
        <label className="field">
          Stan (sztuki)
          <input
            name="stock"
            type="number"
            min="0"
            max="100000"
            step="1"
            value={form.stock}
            onChange={updateField}
            required
          />
        </label>
        <button className="primary" type="submit">
          {editingId ? 'Zapisz kosmetyk' : 'Dodaj kosmetyk'}
        </button>
        {editingId ? (
          <button className="link" type="button" onClick={cancelEdit}>
            Anuluj
          </button>
        ) : null}
      </form>

      {error ? <p className="error">{error}</p> : null}

      <ul className="people card">
        {products.length === 0 ? (
          <li className="empty">Brak kosmetyków.</li>
        ) : null}
        {products.map((product) => (
          <li className="person" key={product.id}>
            <div>
              <p className="name">{product.name}</p>
              <p className="email">{product.stock} szt.</p>
            </div>
            <button
              className="quiet"
              type="button"
              onClick={() => startEdit(product)}
            >
              Edytuj
            </button>
            <button
              className="quiet"
              type="button"
              onClick={() => removeProduct(product)}
            >
              Usuń
            </button>
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

export default Warehouse
