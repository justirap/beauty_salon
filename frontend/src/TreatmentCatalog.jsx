import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

const EMPTY_FORM = {
  name: '',
  description: '',
  durationMinutes: '',
  price: '',
}

function formatPrice(price) {
  return `${Number(price).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`
}

function IngredientLine({ item, canManage, onSave, onRemove }) {
  const [quantity, setQuantity] = useState(String(item.quantityPerVisit))

  useEffect(() => {
    setQuantity(String(item.quantityPerVisit))
  }, [item.quantityPerVisit])

  function commit(event) {
    const next = Number(event.currentTarget.value)
    if (!Number.isInteger(next) || next < 1 || next > 100) {
      setQuantity(String(item.quantityPerVisit))
      return
    }
    setQuantity(String(next))
    if (next !== item.quantityPerVisit) {
      onSave(item, next)
    }
  }

  return (
    <li className="ingredient">
      <span>{item.productName}</span>
      {canManage ? (
        <>
          <input
            aria-label={`Ilość ${item.productName}`}
            type="number"
            min="1"
            max="100"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            onBlur={commit}
          />
          <span>szt.</span>
          <button className="quiet" type="button" onClick={() => onRemove(item)}>
            Usuń
          </button>
        </>
      ) : (
        <span>{item.quantityPerVisit} szt.</span>
      )}
    </li>
  )
}

function RecipeForm({ products, onAdd }) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')

  useEffect(() => {
    if (!products.some((product) => product.id === productId)) {
      setProductId(products[0]?.id ?? '')
    }
  }, [products, productId])

  if (products.length === 0) {
    return null
  }

  function submit(event) {
    event.preventDefault()
    onAdd(productId, Number(quantity))
    setQuantity('1')
  }

  return (
    <form className="recipe" onSubmit={submit}>
      <select
        aria-label="Kosmetyk do zabiegu"
        value={productId}
        onChange={(event) => setProductId(event.target.value)}
        required
      >
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <input
        aria-label="Ilość na wizytę"
        type="number"
        min="1"
        max="100"
        step="1"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        required
      />
      <button className="quiet" type="submit">
        Dodaj
      </button>
    </form>
  )
}

function TreatmentCatalog({ canManage, titled = true }) {
  const formRef = useRef(null)
  const [treatments, setTreatments] = useState([])
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

    api(`/api/treatments?${params}`)
      .then((result) => {
        if (cancelled) {
          return
        }
        setTreatments(result.data)
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

  useEffect(() => {
    if (!canManage) {
      return undefined
    }

    let cancelled = false

    async function loadProducts() {
      const collected = []
      let nextPage = 1
      let totalProducts = 0
      do {
        const result = await api(
          `/api/products?page=${nextPage}&limit=100`,
        )
        collected.push(...result.data)
        totalProducts = result.total
        nextPage += 1
      } while (collected.length < totalProducts)

      if (!cancelled) {
        setProducts(collected)
      }
    }

    loadProducts().catch((loadError) => {
      if (!cancelled) {
        setError(loadError.message)
      }
    })

    return () => {
      cancelled = true
    }
  }, [canManage, reload])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function startEdit(treatment) {
    setEditingId(treatment.id)
    setForm({
      name: treatment.name,
      description: treatment.description,
      durationMinutes: String(treatment.durationMinutes),
      price: String(treatment.price),
    })
    setError('')
    formRef.current?.scrollIntoView({ block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function saveTreatment(event) {
    event.preventDefault()
    setError('')
    const body = {
      name: form.name,
      description: form.description,
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
    }

    try {
      if (editingId) {
        await api(`/api/treatments/${editingId}`, { method: 'PATCH', body })
      } else {
        await api('/api/treatments', { method: 'POST', body })
        setPage(1)
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      setReload((current) => current + 1)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function removeTreatment(treatment) {
    if (!window.confirm(`Usunąć zabieg ${treatment.name}?`)) {
      return
    }
    setError('')
    try {
      await api(`/api/treatments/${treatment.id}`, { method: 'DELETE' })
      if (editingId === treatment.id) {
        setEditingId(null)
        setForm(EMPTY_FORM)
      }
      setReload((current) => current + 1)
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  async function addIngredient(treatment, productId, quantityPerVisit) {
    setError('')
    try {
      await api(`/api/treatments/${treatment.id}/ingredients`, {
        method: 'POST',
        body: { productId, quantityPerVisit },
      })
      setReload((current) => current + 1)
    } catch (addError) {
      setError(addError.message)
    }
  }

  async function saveQuantity(treatment, item, quantityPerVisit) {
    setError('')
    try {
      const updated = await api(
        `/api/treatments/${treatment.id}/ingredients/${item.id}`,
        { method: 'PATCH', body: { quantityPerVisit } },
      )
      setTreatments((current) =>
        current.map((entry) =>
          entry.id !== treatment.id
            ? entry
            : {
                ...entry,
                ingredients: entry.ingredients.map((ingredient) =>
                  ingredient.id === updated.id ? updated : ingredient,
                ),
              },
        ),
      )
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function removeIngredient(treatment, item) {
    setError('')
    try {
      await api(`/api/treatments/${treatment.id}/ingredients/${item.id}`, {
        method: 'DELETE',
      })
      setReload((current) => current + 1)
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  return (
    <section className="catalog">
      {titled ? <h2>Zabiegi</h2> : null}

      {canManage ? (
        <form className="card" ref={formRef} onSubmit={saveTreatment}>
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
            Opis
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              required
              minLength={2}
              maxLength={1000}
              rows={3}
            />
          </label>
          <label className="field">
            Czas (minuty)
            <input
              name="durationMinutes"
              type="number"
              min="1"
              max="480"
              step="1"
              value={form.durationMinutes}
              onChange={updateField}
              required
            />
          </label>
          <label className="field">
            Cena (zł)
            <input
              name="price"
              type="number"
              min="0"
              max="99999.99"
              step="0.01"
              value={form.price}
              onChange={updateField}
              required
            />
          </label>
          <button className="primary" type="submit">
            {editingId ? 'Zapisz zabieg' : 'Dodaj zabieg'}
          </button>
          {editingId ? (
            <button className="link" type="button" onClick={cancelEdit}>
              Anuluj
            </button>
          ) : null}
        </form>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <ul className="people card">
        {treatments.length === 0 ? (
          <li className="empty">Brak zabiegów.</li>
        ) : null}
        {treatments.map((treatment) => {
          const usedIds = new Set(
            (treatment.ingredients ?? []).map((item) => item.productId),
          )
          const available = products.filter((product) => !usedIds.has(product.id))

          return (
            <li className="treatment" key={treatment.id}>
              <div>
                <p className="name">{treatment.name}</p>
                <p className="meta">
                  {treatment.durationMinutes} min · {formatPrice(treatment.price)}
                </p>
                <p className="description">{treatment.description}</p>
                {(treatment.ingredients ?? []).length === 0 ? (
                  <p className="meta">Brak kosmetyków w składzie.</p>
                ) : (
                  <ul className="ingredients">
                    {(treatment.ingredients ?? []).map((item) => (
                      <IngredientLine
                        key={item.id}
                        item={item}
                        canManage={canManage}
                        onSave={(ingredient, quantity) =>
                          saveQuantity(treatment, ingredient, quantity)
                        }
                        onRemove={(ingredient) =>
                          removeIngredient(treatment, ingredient)
                        }
                      />
                    ))}
                  </ul>
                )}
                {canManage ? (
                  <RecipeForm
                    products={available}
                    onAdd={(productId, quantity) =>
                      addIngredient(treatment, productId, quantity)
                    }
                  />
                ) : null}
              </div>
              {canManage ? (
                <div className="actions">
                  <button
                    className="quiet"
                    type="button"
                    onClick={() => startEdit(treatment)}
                  >
                    Edytuj
                  </button>
                  <button
                    className="quiet"
                    type="button"
                    onClick={() => removeTreatment(treatment)}
                  >
                    Usuń
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
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

export default TreatmentCatalog
