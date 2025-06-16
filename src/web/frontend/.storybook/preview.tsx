import type { Preview } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../src/styles/globals.css';

// Create a query client for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Mock modules that depend on app context
const mockModules = () => {
  // Mock WebSocket context
  jest.mock('@/contexts/WebSocketContext', () => ({
    useWebSocket: () => ({
      isConnected: false,
      socket: null,
    }),
    WebSocketProvider: ({ children }: any) => children,
  }));

  // Mock localStorage for server configuration
  const mockLocalStorage = {
    getItem: (key: string) => {
      if (key === 'selectedServer') return 'http://localhost:3301';
      if (key === 'servers') return JSON.stringify(['http://localhost:3301']);
      return null;
    },
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
};

// Initialize mocks
if (typeof jest !== 'undefined') {
  mockModules();
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
};

export default preview;