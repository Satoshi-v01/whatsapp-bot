const key = id => `eco_delivery_prefs_${id}`

export function getDeliveryPrefs(userId) {
  if (!userId) return null
  try {
    return JSON.parse(localStorage.getItem(key(userId)) || 'null')
  } catch {
    return null
  }
}

export function saveDeliveryPrefs(userId, data) {
  if (!userId) return
  localStorage.setItem(key(userId), JSON.stringify(data))
}
