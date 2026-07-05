export const readJsonCache = (key) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null')

    if (!cached || typeof cached !== 'object') {
      return null
    }

    return cached
  } catch (error) {
    localStorage.removeItem(key)
    return null
  }
}

export const writeJsonCache = (key, payload) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        cachedAt: Date.now(),
      }),
    )
  } catch (error) {
    // Ignore storage limits and keep the live UI working.
  }
}

export const removeJsonCache = (key) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    // Ignore storage errors.
  }
}

export const buildSelectionKey = (values = []) => (
  [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))]
    .sort()
    .join(',')
)
