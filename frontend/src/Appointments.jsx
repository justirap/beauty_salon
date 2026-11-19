import { useEffect, useState } from 'react'
import { api, getToken } from './api.js'

const STATUS_LABELS = {
  BOOKED: 'Umówiona',
  CANCELLED: 'Odwołana',
}

function formatWhen(value) {
  return new Date(value).toLocaleString('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatRange(start, end) {
  const starts = new Date(start)
  const ends = new Date(end)
  const endLabel = ends.toLocaleTimeString('pl-PL', { timeStyle: 'short' })
  return `${formatWhen(starts)}–${endLabel}`
}

function localInputMin(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function loadAll(path) {
  const collected = []
  let page = 1
  let total = 0
  do {
    const result = await api(`${path}?page=${page}&limit=100`)
    collected.push(...result.data)
    total = result.total
    page += 1
  } while (collected.length < total)
  return collected
}

function VisitPhoto({ appointmentId, photoId }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    const token = getToken()

    fetch(`/api/appointments/${appointmentId}/photos/${photoId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Nie udało się wczytać zdjęcia')
        }
        return response.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) {
          setSrc(objectUrl)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [appointmentId, photoId])

  return src ? <img src={src} alt="Zdjęcie inspiracji" /> : null
}

function whoLine(appointment, role) {
  const client = `${appointment.client.firstName} ${appointment.client.lastName}`
  const stylist = `${appointment.stylist.firstName} ${appointment.stylist.lastName}`
  if (role === 'CLIENT') {
    return stylist
  }
  if (role === 'STYLIST') {
    return client
  }
  return `${client} · ${stylist}`
}

function Appointments({ role }) {
  const [appointments, setAppointments] = useState([])
  const [treatments, setTreatments] = useState([])
  const [stylists, setStylists] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [treatmentId, setTreatmentId] = useState('')
  const [stylistId, setStylistId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const canBook = role === 'CLIENT'

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ page: String(page), limit: '5' })

    api(`/api/appointments?${params}`)
      .then((result) => {
        if (cancelled) {
          return
        }
        setAppointments(result.data)
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
    if (!canBook) {
      return undefined
    }

    let cancelled = false
    Promise.all([loadAll('/api/treatments'), api('/api/stylists')])
      .then(([treatmentList, stylistList]) => {
        if (cancelled) {
          return
        }
        setTreatments(treatmentList)
        setStylists(stylistList)
        setTreatmentId((current) => current || treatmentList[0]?.id || '')
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [canBook])

  const availableStylists = stylists.filter((stylist) =>
    stylist.treatments.some((treatment) => treatment.id === treatmentId),
  )
  const selectedTreatment = treatments.find((item) => item.id === treatmentId)
  const visitEnd =
    selectedTreatment && startsAt
      ? new Date(
          new Date(startsAt).getTime() +
            selectedTreatment.durationMinutes * 60_000,
        ).toLocaleTimeString('pl-PL', { timeStyle: 'short' })
      : ''

  useEffect(() => {
    const next = stylists.filter((stylist) =>
      stylist.treatments.some((treatment) => treatment.id === treatmentId),
    )
    if (!next.some((stylist) => stylist.id === stylistId)) {
      setStylistId(next[0]?.id ?? '')
    }
  }, [treatmentId, stylists, stylistId])

  async function book(event) {
    event.preventDefault()
    setError('')
    try {
      await api('/api/appointments', {
        method: 'POST',
        body: {
          treatmentId,
          stylistId,
          startsAt: new Date(startsAt).toISOString(),
        },
      })
      setStartsAt('')
      setPage(1)
      setReload((current) => current + 1)
    } catch (bookError) {
      setError(bookError.message)
    }
  }

  async function addPhoto(event, appointment) {
    event.preventDefault()
    const form = event.currentTarget
    const file = form.elements.file.files?.[0]
    if (!file) {
      return
    }
    const body = new FormData()
    body.append('file', file)
    setError('')
    try {
      await api(`/api/appointments/${appointment.id}/photos`, {
        method: 'POST',
        body,
      })
      form.reset()
      setReload((current) => current + 1)
    } catch (addError) {
      setError(addError.message)
    }
  }

  async function removePhoto(appointment, photo) {
    if (!window.confirm('Usunąć zdjęcie inspiracji?')) {
      return
    }
    setError('')
    try {
      await api(`/api/appointments/${appointment.id}/photos/${photo.id}`, {
        method: 'DELETE',
      })
      setReload((current) => current + 1)
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  async function cancel(appointment) {
    const when = formatWhen(appointment.startsAt)
    if (!window.confirm(`Odwołać wizytę ${appointment.treatment.name}, ${when}?`)) {
      return
    }
    setError('')
    try {
      await api(`/api/appointments/${appointment.id}/cancel`, { method: 'POST' })
      setReload((current) => current + 1)
    } catch (cancelError) {
      setError(cancelError.message)
    }
  }

  const canCancel = role === 'CLIENT' || role === 'ADMIN'

  return (
    <section className="visits">
      {canBook ? (
        <form className="card" onSubmit={book}>
          <label className="field">
            Zabieg
            <select
              value={treatmentId}
              onChange={(event) => setTreatmentId(event.target.value)}
              required
            >
              {treatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Stylistka
            <select
              value={stylistId}
              onChange={(event) => setStylistId(event.target.value)}
              required
              disabled={availableStylists.length === 0}
            >
              {availableStylists.length === 0 ? (
                <option value="">Brak stylistki do tego zabiegu</option>
              ) : null}
              {availableStylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {stylist.firstName} {stylist.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Termin
            <input
              type="datetime-local"
              value={startsAt}
              min={localInputMin(new Date())}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>
          {selectedTreatment ? (
            <p className="meta">
              {visitEnd
                ? `Zabieg trwa ${selectedTreatment.durationMinutes} min, do ${visitEnd}.`
                : `Zabieg trwa ${selectedTreatment.durationMinutes} min.`}
            </p>
          ) : null}
          <button
            className="primary"
            type="submit"
            disabled={availableStylists.length === 0}
          >
            Umów wizytę
          </button>
        </form>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <ul className="people card">
        {appointments.length === 0 ? (
          <li className="empty">Brak wizyt.</li>
        ) : null}
        {appointments.map((appointment) => (
          <li
            className={
              appointment.status === 'CANCELLED'
                ? 'treatment cancelled'
                : 'treatment'
            }
            key={appointment.id}
          >
            <div>
              <p className="name">{appointment.treatment.name}</p>
              <p className="meta">
                {formatRange(appointment.startsAt, appointment.endsAt)} · {STATUS_LABELS[appointment.status]}
              </p>
              <p className="description">{whoLine(appointment, role)}</p>
              {(appointment.photos ?? []).length > 0 ? (
                <ul className="photos">
                  {appointment.photos.map((photo) => (
                    <li className="photo" key={photo.id}>
                      <VisitPhoto
                        appointmentId={appointment.id}
                        photoId={photo.id}
                      />
                      {role === 'CLIENT' ? (
                        <button
                          className="quiet"
                          type="button"
                          onClick={() => removePhoto(appointment, photo)}
                        >
                          Usuń zdjęcie
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {role === 'CLIENT' && appointment.status === 'BOOKED' ? (
                <form
                  className="photo-form"
                  onSubmit={(event) => addPhoto(event, appointment)}
                >
                  <input
                    name="file"
                    aria-label="Zdjęcie inspiracji"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                  <button className="quiet" type="submit">
                    Dodaj zdjęcie
                  </button>
                </form>
              ) : null}
            </div>
            {canCancel && appointment.status === 'BOOKED' ? (
              <button
                className="quiet"
                type="button"
                onClick={() => cancel(appointment)}
              >
                Odwołaj
              </button>
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

export default Appointments
