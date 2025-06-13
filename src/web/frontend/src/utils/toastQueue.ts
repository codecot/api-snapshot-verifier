import toast from 'react-hot-toast'

interface QueuedToast {
  id: string
  type: 'success' | 'error' | 'loading' | 'info'
  message: string
  options?: any
  timestamp: number
}

class ToastQueue {
  private queue: QueuedToast[] = []
  private processing = false
  private readonly BATCH_DELAY = 300 // ms to wait for batching
  private readonly MAX_CONCURRENT = 2 // max toasts at once
  private activeToasts = 0

  // Add toast to queue
  add(type: 'success' | 'error' | 'loading' | 'info', message: string, options?: any) {
    const id = `${type}-${Date.now()}-${Math.random()}`
    
    // Check for duplicate recent messages (within 1 second)
    const now = Date.now()
    const isDuplicate = this.queue.some(t => 
      t.message === message && 
      t.type === type && 
      (now - t.timestamp) < 1000
    )
    
    if (isDuplicate) {
      console.log('🚫 Skipping duplicate toast:', message)
      return
    }

    this.queue.push({
      id,
      type,
      message,
      options,
      timestamp: now
    })

    this.processQueue()
  }

  // Process the queue with batching and throttling
  private async processQueue() {
    if (this.processing) return
    this.processing = true

    // Wait for potential batching
    await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY))

    while (this.queue.length > 0 && this.activeToasts < this.MAX_CONCURRENT) {
      const toastItem = this.queue.shift()
      if (!toastItem) break

      // Check if we can batch similar messages
      const similarToasts = this.extractSimilarToasts(toastItem)
      
      if (similarToasts.length > 1) {
        this.showBatchedToast(similarToasts)
      } else {
        this.showSingleToast(toastItem)
      }

      // Small delay between toasts
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    this.processing = false

    // Continue processing if there are more items
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 500)
    }
  }

  // Extract similar toasts for batching
  private extractSimilarToasts(baseToast: QueuedToast): QueuedToast[] {
    const similar = [baseToast]
    
    // Look for similar toasts in the queue
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const toast = this.queue[i]
      if (this.areSimilar(baseToast, toast)) {
        similar.push(toast)
        this.queue.splice(i, 1)
      }
    }

    return similar
  }

  // Check if two toasts are similar enough to batch
  private areSimilar(toast1: QueuedToast, toast2: QueuedToast): boolean {
    if (toast1.type !== toast2.type) return false
    
    // Batch similar snapshot/capture messages
    const captureKeywords = ['snapshot', 'capture', 'endpoint']
    const isCaptureRelated = (msg: string) => 
      captureKeywords.some(keyword => msg.toLowerCase().includes(keyword))
    
    return isCaptureRelated(toast1.message) && isCaptureRelated(toast2.message)
  }

  // Show a single toast
  private showSingleToast(toastItem: QueuedToast) {
    this.activeToasts++
    
    const toastOptions = {
      ...toastItem.options,
      onClose: () => {
        this.activeToasts--
      }
    }

    switch (toastItem.type) {
      case 'success':
        toast.success(toastItem.message, toastOptions)
        break
      case 'error':
        toast.error(toastItem.message, toastOptions)
        break
      case 'loading':
        toast.loading(toastItem.message, toastOptions)
        break
      default:
        toast(toastItem.message, toastOptions)
    }
  }

  // Show batched toasts as a summary
  private showBatchedToast(toasts: QueuedToast[]) {
    this.activeToasts++
    
    const type = toasts[0].type
    const count = toasts.length
    
    let message: string
    if (type === 'success') {
      message = `📸 ${count} operations completed successfully`
    } else if (type === 'error') {
      message = `❌ ${count} operations failed`
    } else {
      message = `📋 ${count} operations processed`
    }

    const toastOptions = {
      duration: 3000,
      onClose: () => {
        this.activeToasts--
      }
    }

    switch (type) {
      case 'success':
        toast.success(message, toastOptions)
        break
      case 'error':
        toast.error(message, toastOptions)
        break
      default:
        toast(message, toastOptions)
    }
  }

  // Clear the queue (useful for cleanup)
  clear() {
    this.queue = []
  }
}

// Create singleton instance
export const toastQueue = new ToastQueue()

// Convenience methods that match toast API
export const queuedToast = {
  success: (message: string, options?: any) => toastQueue.add('success', message, options),
  error: (message: string, options?: any) => toastQueue.add('error', message, options),
  loading: (message: string, options?: any) => toastQueue.add('loading', message, options),
  info: (message: string, options?: any) => toastQueue.add('info', message, options),
}