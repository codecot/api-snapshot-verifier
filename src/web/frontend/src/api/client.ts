import axios from 'axios'
import toast from 'react-hot-toast'
import { config, isDev } from '../config'

// Get backend URL from localStorage or use default
const getBackendUrl = (): string => {
  try {
    const stored = localStorage.getItem('api-snapshot-backend-config')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.backendUrl) {
        const apiUrl = `${parsed.backendUrl}/api`
        console.log('🔧 API Client using stored backend URL:', apiUrl)
        return apiUrl
      }
    }
  } catch (error) {
    console.warn('Failed to parse stored backend config:', error)
  }
  
  // Fallback to default
  const fallbackUrl = isDev ? '/api' : `${config.api.baseUrl}/api`
  console.log('🔧 API Client using fallback URL:', fallbackUrl)
  return fallbackUrl
}

// Create API client with dynamic backend URL
const apiClient = axios.create({
  baseURL: getBackendUrl(),
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Listen for backend URL changes
window.addEventListener('backend-url-changed', (event: any) => {
  const { backendUrl } = event.detail
  const newApiUrl = `${backendUrl}/api`
  console.log('🔧 API Client URL changed to:', newApiUrl)
  apiClient.defaults.baseURL = newApiUrl
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred'
    toast.error(message)
    return Promise.reject(error)
  }
)

export default apiClient