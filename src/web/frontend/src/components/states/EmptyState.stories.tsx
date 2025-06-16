import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState, NoDataEmptyState, ErrorEmptyState, SearchEmptyState } from './EmptyState';
import { Inbox, Package, Plus, RefreshCw, Search, AlertCircle, FolderOpen, FileX } from 'lucide-react';

const meta = {
  title: 'Components/States/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: false,
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No items found',
    description: 'Get started by creating your first item.',
  },
};

export const WithIcon: Story = {
  args: {
    icon: Inbox,
    title: 'No messages',
    description: 'When you receive messages, they will appear here.',
  },
};

export const WithAction: Story = {
  args: {
    icon: Package,
    title: 'No products',
    description: 'Start by adding your first product to the catalog.',
    action: {
      label: 'Add Product',
      onClick: () => console.log('Add product clicked'),
      icon: Plus,
    },
  },
};

export const WithMultipleActions: Story = {
  args: {
    icon: FileX,
    title: 'No documents',
    description: 'Upload documents or create new ones to get started.',
    action: {
      label: 'Upload',
      onClick: () => console.log('Upload clicked'),
    },
    secondaryAction: {
      label: 'Create New',
      onClick: () => console.log('Create clicked'),
      icon: Plus,
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-8">
      <EmptyState
        icon={Search}
        title="Small Empty State"
        description="This is a small empty state"
        size="sm"
      />
      <EmptyState
        icon={Search}
        title="Medium Empty State"
        description="This is a medium empty state (default)"
        size="md"
      />
      <EmptyState
        icon={Search}
        title="Large Empty State"
        description="This is a large empty state for prominent display"
        size="lg"
      />
    </div>
  ),
};

export const NoData: Story = {
  render: () => <NoDataEmptyState onRefresh={() => console.log('Refresh clicked')} />,
};

export const Error: Story = {
  render: () => (
    <ErrorEmptyState 
      error="Failed to load data from the server" 
      onRetry={() => console.log('Retry clicked')} 
    />
  ),
};

export const SearchNoResults: Story = {
  render: () => (
    <SearchEmptyState 
      searchTerm="api endpoints" 
      onClear={() => console.log('Clear search clicked')} 
    />
  ),
};

export const CustomStyling: Story = {
  args: {
    icon: FolderOpen,
    title: 'No files uploaded',
    description: 'Drag and drop files here or click to browse',
    className: 'bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed',
    action: {
      label: 'Browse Files',
      onClick: () => console.log('Browse clicked'),
      variant: 'outline',
    },
  },
};

export const ApiEndpointExample: Story = {
  args: {
    icon: AlertCircle,
    title: 'No API endpoints configured',
    description: 'Import an OpenAPI specification or add endpoints manually to start monitoring your APIs.',
    action: {
      label: 'Import OpenAPI',
      onClick: () => console.log('Import clicked'),
    },
    secondaryAction: {
      label: 'Add Manually',
      onClick: () => console.log('Add manually clicked'),
    },
  },
};