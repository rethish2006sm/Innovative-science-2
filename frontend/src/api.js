import { clearAuth, getStoredAuth } from './authStorage'
import { getActiveScience } from './science'

const normalizeBaseUrl = (value) => String(value || '').replace(/\/$/, '')

const resolveApiBaseUrl = () => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_API_URL)

  if (configured) {
    return configured
  }

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return 'https://innovative-science-2-backend.onrender.com'
  }

  return 'http://localhost:5000'
}

export const API_BASE_URL = resolveApiBaseUrl()

// Keep stable public responses instantly available when users move between
// pages. This also deduplicates simultaneous requests caused by React effects.
const responseCache = new Map()
const pendingRequests = new Map()
const CACHE_TTL = 15_000
const cacheablePaths = ['/api/chapters', '/api/classes', '/api/feedback/featured', '/api/announcement']

export const assetUrl = (path) => {
  if (!path) {
    return ''
  }

  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`
}

export const apiRequest = async (path, options = {}) => {
  const auth = getStoredAuth()
  const activeScience = options.science || getActiveScience()
  const method = String(options.method || 'GET').toUpperCase()
  const canCache = method === 'GET'
    && options.cache !== 'no-store'
    && cacheablePaths.some((cacheablePath) => path === cacheablePath || path.startsWith(`${cacheablePath}?`))
  const cacheKey = `${API_BASE_URL}${activeScience}${path}|${auth?.token ? 'auth' : 'public'}`

  if (method !== 'GET') {
    responseCache.clear()
  }

  if (canCache) {
    const cached = responseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }
  }

  if (method === 'GET' && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }
  headers['X-Science'] = activeScience
  if (typeof Intl !== 'undefined') {
    headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta'
  }

  const request = fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  }).then(async (response) => {
    const isJson = response.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await response.json() : null

    if (!response.ok) {
      if (response.status === 401) {
        clearAuth()
      }

      const error = new Error(data?.message || 'Something went wrong.')
      error.status = response.status
      throw error
    }

    if (canCache) {
      responseCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL })
    }

    return data
  }).finally(() => {
    if (method === 'GET') pendingRequests.delete(cacheKey)
  })

  if (method === 'GET') pendingRequests.set(cacheKey, request)
  return request
}
