import { useEffect, useState } from 'react'
import { api } from './api.js'

async function loadTreatments() {
  const collected = []
  let page = 1
  let total = 0
  do {
    const result = await api(`/api/treatments?page=${page}&limit=100`)
    collected.push(...result.data)
    total = result.total
    page += 1
  } while (collected.length < total)
  return collected
}

function StylistSkills({ stylistId, onError }) {
  const [treatments, setTreatments] = useState([])
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false

    Promise.all([loadTreatments(), api('/api/stylists')])
      .then(([treatmentList, stylists]) => {
        if (cancelled) {
          return
        }
        const stylist = stylists.find((item) => item.id === stylistId)
        setTreatments(treatmentList)
        setSelected(new Set((stylist?.treatments ?? []).map((item) => item.id)))
      })
      .catch((loadError) => {
        if (!cancelled) {
          onError(loadError.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [stylistId, onError])

  async function toggle(treatment) {
    const hasSkill = selected.has(treatment.id)
    onError('')
    try {
      if (hasSkill) {
        await api(`/api/stylists/${stylistId}/treatments/${treatment.id}`, {
          method: 'DELETE',
        })
        setSelected((current) => {
          const next = new Set(current)
          next.delete(treatment.id)
          return next
        })
      } else {
        await api(`/api/stylists/${stylistId}/treatments`, {
          method: 'POST',
          body: { treatmentId: treatment.id },
        })
        setSelected((current) => new Set(current).add(treatment.id))
      }
    } catch (toggleError) {
      onError(toggleError.message)
    }
  }

  if (treatments.length === 0) {
    return null
  }

  return (
    <div className="skills">
      {treatments.map((treatment) => (
        <label className="skill" key={treatment.id}>
          <input
            type="checkbox"
            checked={selected.has(treatment.id)}
            onChange={() => toggle(treatment)}
          />
          {treatment.name}
        </label>
      ))}
    </div>
  )
}

export default StylistSkills
