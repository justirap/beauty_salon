const TOKEN_KEY = 'glamora_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export async function api(path, options = {}) {
  const { method = 'GET', body, auth = true } = options
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  let response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Brak połączenia z serwerem')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const raw = data?.message
    const message = Array.isArray(raw)
      ? raw.join(' ')
      : raw || 'Nie udało się wykonać żądania'
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return data
}
