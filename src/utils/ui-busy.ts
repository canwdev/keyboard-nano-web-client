import { computed, ref } from 'vue'

const busyCount = ref(0)
export const uiBusyMessage = ref('处理中，请稍候...')

export const isUiBusy = computed(() => busyCount.value > 0)

export async function runWithUiBusy<T>(message: string, task: () => Promise<T>) {
  busyCount.value += 1
  uiBusyMessage.value = message

  try {
    return await task()
  }
  finally {
    busyCount.value = Math.max(0, busyCount.value - 1)
    if (busyCount.value === 0) {
      uiBusyMessage.value = '处理中，请稍候...'
    }
  }
}
