import { useEffect, useState } from 'react'
import client, { DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { useAuthStore } from '@/stores/authStore'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
}

export function useRealtimeNotifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    // Subscribe to notifications collection for this user
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTION_IDS.NOTIFICATIONS}.documents`

    const unsub = client.subscribe(channel, (event) => {
      if (event.events.includes('databases.*.collections.*.documents.*.create')) {
        const doc = event.payload as any
        if (doc.user_id === user.id) {
          const notif: Notification = {
            id: doc.$id,
            title: doc.title,
            body: doc.body,
            type: doc.type,
            read: doc.read,
            createdAt: doc.$createdAt
          }
          setNotifications(prev => [notif, ...prev])
          setUnreadCount(prev => prev + 1)

          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(notif.title, { body: notif.body })
          }
        }
      }
    })

    return () => unsub()
  }, [user?.id])

  return { notifications, unreadCount }
}
