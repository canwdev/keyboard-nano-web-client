import type { INotification } from './components/CommonUI/NotificationList/notification-list'

declare global {
  interface HIDCollectionInfo {
    usagePage: number
    usage: number
  }

  interface HIDDeviceFilter {
    vendorId?: number
    productId?: number
    usagePage?: number
    usage?: number
  }

  interface HIDInputReportEvent extends Event {
    readonly data: DataView
    readonly device: HIDDevice
    readonly reportId: number
  }

  interface HIDDevice extends EventTarget {
    readonly collections: HIDCollectionInfo[]
    readonly opened: boolean
    readonly productId: number
    readonly productName?: string
    readonly vendorId: number
    close: () => Promise<void>
    open: () => Promise<void>
    sendReport: (reportId: number, data: BufferSource) => Promise<void>
    addEventListener: (
      type: 'inputreport',
      listener: (event: HIDInputReportEvent) => void,
      options?: boolean | AddEventListenerOptions,
    ) => void
    removeEventListener: (
      type: 'inputreport',
      listener: (event: HIDInputReportEvent) => void,
      options?: boolean | EventListenerOptions,
    ) => void
  }

  interface HID extends EventTarget {
    getDevices: () => Promise<HIDDevice[]>
    requestDevice: (options: { filters: HIDDeviceFilter[] }) => Promise<HIDDevice[]>
  }

  interface Navigator {
    hid: HID
  }

  interface Window {
    $notification: (notification: Partial<INotification>) => void
  }
}
