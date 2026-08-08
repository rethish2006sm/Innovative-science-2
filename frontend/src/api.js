import { clearAuth, getStoredAuth } from './authStorage'

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

export const assetUrl = (path) => {
  if (!path) {
    return ''
  }

  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`
}

export const apiRequest = async (path, options = {}) => {
  const auth = getStoredAuth()
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

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

  return data
}
