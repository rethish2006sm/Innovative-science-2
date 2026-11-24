const CLIENT_ID_KEY = 'innovative_science_2_client_id'

const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const getClientId = () => {
  try {
    const savedClientId = localStorage.getItem(CLIENT_ID_KEY)

    if (savedClientId) {
      return savedClientId
    }

    const nextClientId = createClientId()
    localStorage.setItem(CLIENT_ID_KEY, nextClientId)
    return nextClientId
  } catch (error) {
    return createClientId()
  }
}
