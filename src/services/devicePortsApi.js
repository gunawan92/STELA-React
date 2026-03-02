const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function buildDevicePortsUrl() {
  if (!API_BASE_URL) return null
  if (API_BASE_URL.endsWith('/api')) return `${API_BASE_URL}/device/ports`
  return `${API_BASE_URL}/api/device/ports`
}

export async function fetchRfidPortState() {
  const url = buildDevicePortsUrl()
  if (!url) {
    throw new Error('VITE_API_BASE_URL belum diset untuk device ports.')
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Gagal mengambil status port RFID.')
  }

  const payload = await response.json()
  return payload?.data || { slots: [], availablePorts: [] }
}

export async function autoAssignRfidPorts() {
  const baseUrl = buildDevicePortsUrl()
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL belum diset untuk device ports.')
  }

  const response = await fetch(`${baseUrl}/auto-assign`, {
    method: 'POST',
  })
  if (!response.ok) {
    let message = 'Gagal auto-assign port RFID.'
    try {
      const payload = await response.json()
      message = payload?.error?.message || payload?.message || message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  const payload = await response.json()
  return payload?.data || { slots: [], availablePorts: [] }
}
