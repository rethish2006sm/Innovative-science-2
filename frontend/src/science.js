export const SCIENCE_STORAGE_KEY = 'activeScience'
export const SCIENCE_CHANGED_EVENT = 'innovative-science-changed'

export const normalizeScience = (value) => value === 'science1' ? 'science1' : 'science2'

export const getActiveScience = () => {
  if (typeof window === 'undefined') return 'science2'
  return normalizeScience(window.localStorage.getItem(SCIENCE_STORAGE_KEY))
}

export const setActiveScience = (science) => {
  const nextScience = normalizeScience(science)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SCIENCE_STORAGE_KEY, nextScience)
    window.dispatchEvent(new CustomEvent(SCIENCE_CHANGED_EVENT, { detail: { science: nextScience } }))
  }
  return nextScience
}
