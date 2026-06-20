type WorkerMessage
  = | { type: 'start', intervalMs: number }
    | { type: 'stop' }

type WorkerScope = typeof globalThis & {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null
  postMessage: (message: { step: number, type: 'tick' }) => void
}

let timer: ReturnType<typeof setInterval> | undefined
let step = 0
const workerScope = globalThis as WorkerScope

function stopLoop() {
  if (!timer) {
    return
  }

  clearInterval(timer)
  timer = undefined
}

workerScope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === 'stop') {
    stopLoop()
    step = 0
    return
  }

  stopLoop()
  step = 0
  timer = setInterval(() => {
    workerScope.postMessage({
      type: 'tick',
      step,
    })
    step += 1
  }, event.data.intervalMs)
}
