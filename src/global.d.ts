import {INotification} from './components/CommonUI/NotificationList/notification-list'

declare global {
  interface Window {
    $notification: (notification: Partial<INotification>) => void
  }
}
