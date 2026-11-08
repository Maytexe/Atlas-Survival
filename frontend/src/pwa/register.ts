import { registerSW } from 'virtual:pwa-register'

export const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event('atlas:pwa-update-ready'))
  },
  onOfflineReady() {
    window.dispatchEvent(new Event('atlas:pwa-offline-ready'))
  },
})
