import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import SpaceSelector from './SpaceSelector';

// Mock the SpaceContext module
const mockSpaceData = {
  currentSpace: 'development',
  availableSpaces: ['default', 'development', 'staging', 'production', 'qa-testing', 'sandbox'],
  spacesInfo: [
    { name: 'default', endpoint_count: 5 },
    { name: 'development', endpoint_count: 12 },
    { name: 'staging', endpoint_count: 8 },
    { name: 'production', endpoint_count: 15 },
    { name: 'qa-testing', endpoint_count: 3 },
    { name: 'sandbox', endpoint_count: 0 },
  ],
  isLoading: false,
  switchSpace: (space: string) => console.log('Switch to space:', space),
  createSpace: async (name: string) => console.log('Create space:', name),
  deleteSpace: async (name: string) => console.log('Delete space:', name),
  refreshSpaces: async () => console.log('Refresh spaces'),
};

// Create a wrapper that provides mock data
const SpaceSelectorWrapper = ({ overrides = {} }: { overrides?: Partial<typeof mockSpaceData> }) => {
  const mockData = { ...mockSpaceData, ...overrides };
  
  // Mock the useSpace hook
  React.useEffect(() => {
    const original = jest.requireActual('@/contexts/SpaceContext');
    jest.mock('@/contexts/SpaceContext', () => ({
      ...original,
      useSpace: () => mockData,
    }));
  }, [mockData]);

  return <SpaceSelector />;
};

const meta = {
  title: 'Components/SpaceSelector',
  component: SpaceSelector,
  decorators: [
    (Story) => (
      <div className="flex justify-end p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'padded',
    // Disable WebSocket for stories
    mockData: {
      '@/contexts/WebSocketContext': {
        useWebSocket: () => ({
          isConnected: false,
          socket: null,
        }),
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpaceSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// For now, let's create a simple demo that doesn't rely on complex mocking
export const Demo: Story = {
  render: () => {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Note: SpaceSelector requires application context. Here's a static preview:
        </p>
        <img 
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='40' viewBox='0 0 200 40'%3E%3Crect x='0' y='0' width='200' height='40' rx='6' fill='%23f3f4f6' stroke='%23e5e7eb' stroke-width='2'/%3E%3Ctext x='10' y='25' font-family='system-ui' font-size='14' fill='%23374151'%3Edevelopment%3C/text%3E%3Ctext x='150' y='25' font-family='system-ui' font-size='12' fill='%236b7280'%3E12%3C/text%3E%3Cpath d='M 180 15 L 185 20 L 190 15' stroke='%236b7280' stroke-width='2' fill='none'/%3E%3C/svg%3E"
          alt="Space Selector Preview"
          className="border rounded"
        />
        <div className="text-sm space-y-2">
          <p><strong>Features:</strong></p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Environment-aware styling (production=red, staging=yellow, dev=green)</li>
            <li>Shows endpoint count for each space</li>
            <li>Create new spaces inline</li>
            <li>Delete non-default spaces</li>
            <li>Current space highlighted with ring</li>
          </ul>
        </div>
      </div>
    );
  },
};

// Visual examples of different states
export const EnvironmentExamples: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Environment Color Coding:</h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-2 border-red-200 dark:border-red-800">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12" y2="16"/>
          </svg>
          <span className="font-medium">production</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-background/60">15</span>
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-2 border-yellow-200 dark:border-yellow-800">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 8 12 12 14 14"/>
          </svg>
          <span className="font-medium">staging</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-background/60">8</span>
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-800">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="font-medium">development</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-background/60">12</span>
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
          <span className="font-medium">custom-space</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-background/60">7</span>
        </div>
      </div>
    </div>
  ),
};