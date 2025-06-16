// import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { SpaceProvider } from '@/contexts/SpaceContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { CaptureProgressProvider } from '@/contexts/CaptureProgressContext'
import { ToastProvider, ToastInitializer } from '@/components/ui/toast'
import { ThemeProvider } from '@/design-system/theme/ThemeProvider'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ThemeProvider>
        <ToastProvider>
          <WebSocketProvider>
            <SpaceProvider>
              <CaptureProgressProvider>
                <App />
                <ToastInitializer />
              </CaptureProgressProvider>
            </SpaceProvider>
          </WebSocketProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
)