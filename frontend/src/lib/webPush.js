import { apiRequest } from '../api'

const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}

export const registerWebPush = async ({ requestPermission = true } = {}) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false }
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) return { supported: false }

  // Browsers only show the native prompt when permission is still "default".
  // If it was denied, they require the student to enable it in site settings.
  if (Notification.permission === 'denied') {
    return { supported: true, permission: 'denied' }
  }

  const permission = Notification.permission === 'default' && requestPermission
    ? await Notification.requestPermission()
    : Notification.permission
  if (permission !== 'granted') return { supported: true, permission }

  const registration = await navigator.serviceWorker.register('/sw.js')
  let subscription = await registration.pushManager.getSubscription()
  const storedVapidKey = window.localStorage.getItem('innovative-science-vapid-public-key')
  if (subscription && storedVapidKey !== publicKey) {
    await subscription.unsubscribe()
    subscription = null
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  await apiRequest('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })
  window.localStorage.setItem('innovative-science-vapid-public-key', publicKey)
  return { supported: true, permission: 'granted' }
}

export const getWebPushSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, subscribed: false, permission: 'unsupported' }
  }

  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager?.getSubscription()
  return {
    supported: true,
    subscribed: Boolean(subscription),
    permission: Notification.permission,
  }
}

export const unregisterWebPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { subscribed: false }
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager?.getSubscription()
  if (subscription) {
    await apiRequest('/api/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    await subscription.unsubscribe()
  }
  return { subscribed: false }
}

export const sendCurrentDevicePush = async ({ title, body, url = '/#/' }) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { sent: false }
  }

  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager?.getSubscription()
  if (!subscription) return { sent: false }

  return apiRequest('/api/push/device-message', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      title,
      body,
      url,
    }),
  })
}
