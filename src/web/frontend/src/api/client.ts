import axios from 'axios'
import toast from 'react-hot-toast'
import { config, isDev } from '../config'

// Create API client with dynamic backend URL
const apiClient = axios.create({
  baseURL: isDev ? '/api' : `${config.api.baseUrl}/api`, // Use proxy in dev, direct URL in production
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
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