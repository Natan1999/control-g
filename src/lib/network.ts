import { Network } from '@capacitor/network'

export async function isOnline(): Promise<boolean> {
  try {
    const status = await Network.getStatus()
    return status.connected
  } catch {
    return typeof navigator === 'undefined' ? false : navigator.onLine
  }
}
