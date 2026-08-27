import { useContext } from 'react'
import { EmployeeNotificationContext } from './employeeNotificationContext.js'

export function useEmployeeNotifications() {
  const ctx = useContext(EmployeeNotificationContext)
  if (!ctx) {
    return {
      unreadCount: 0,
      notifications: [],
      refreshUnread: async () => {},
      refreshNotifications: async () => [],
      markRead: async () => {},
      markAllRead: async () => {},
      enabled: false,
    }
  }
  return ctx
}
