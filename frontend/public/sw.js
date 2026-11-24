self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data?.text() || 'You have a new update.' }
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Innovative Science 2', {
    body: data.body || 'You have a new learning update.',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: data.tag || 'innovative-science-update',
    data: { url: data.url || '/#/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/#/', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => 'focus' in client)
    if (existing) {
      existing.navigate(targetUrl)
      return existing.focus()
    }
    return self.clients.openWindow(targetUrl)
  }))
})
