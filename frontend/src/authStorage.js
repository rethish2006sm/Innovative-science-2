const AUTH_KEY = 'innovative_science_2_auth'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const authEvents = {
  changed: 'innovative-science-auth-changed',
}

export const getStoredAuth = () => {
  try {
    const savedAuth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')

    if (!savedAuth?.token || !savedAuth?.user || Date.now() > savedAuth.expiresAt) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }

    return savedAuth
  } catch (error) {
    localStorage.removeItem(AUTH_KEY)
    return null
  }
}

export const saveAuth = ({ token, user }) => {
  const auth = {
    token,
    user,
    expiresAt: Date.now() + SEVEN_DAYS_MS,
  }

  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
  window.dispatchEvent(new CustomEvent(authEvents.changed, { detail: auth }))
  return auth
}

export const updateStoredUser = (user) => {
  const auth = getStoredAuth()

  if (!auth) {
    return null
  }

  return saveAuth({ token: auth.token, user })
}

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY)
  window.dispatchEvent(new CustomEvent(authEvents.changed))
}
