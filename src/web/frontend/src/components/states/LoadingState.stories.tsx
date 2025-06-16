import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState, Skeleton, EndpointCardSkeleton, TableRowSkeleton } from './LoadingState';

const meta = {
  title: 'Components/States/LoadingState',
  component: LoadingState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Loading...',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Small</p>
        <LoadingState size="sm" message="Loading data..." />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Medium (Default)</p>
        <LoadingState size="md" message="Loading data..." />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Large</p>
        <LoadingState size="lg" message="Loading data..." />
      </div>
    </div>
  ),
};

export const WithoutMessage: Story = {
  args: {
    message: '',
  },
};

export const CustomMessages: Story = {
  render: () => (
    <div className="space-y-8">
      <LoadingState message="Fetching API endpoints..." />
      <LoadingState message="Analyzing snapshots..." />
      <LoadingState message="Connecting to server..." />
      <LoadingState message="Importing OpenAPI specification..." />
    </div>
  ),
};

export const FullPage: Story = {
  args: {
    fullPage: true,
    message: 'Loading application...',
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const InlineLoading: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Card with inline loading</h3>
        <LoadingState size="sm" message="Refreshing data..." />
      </div>
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span>Processing request</span>
          <LoadingState size="sm" message="" />
        </div>
      </div>
    </div>
  ),
};

export const SkeletonLoader: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <div>
        <h3 className="font-semibold mb-2">Basic Skeleton</h3>
        <Skeleton className="h-4 w-full" />
      </div>
      <div>
        <h3 className="font-semibold mb-2">Multiple Lines</h3>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Card Skeleton</h3>
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const EndpointCardSkeletonDemo: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <h3 className="font-semibold">Endpoint Card Loading State</h3>
      <EndpointCardSkeleton />
      <EndpointCardSkeleton />
    </div>
  ),
};

export const TableSkeletonDemo: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <h3 className="font-semibold mb-4">Table Loading State</h3>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">Name</th>
            <th className="text-left p-4">Status</th>
            <th className="text-left p-4">Last Updated</th>
            <th className="text-left p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <TableRowSkeleton columns={4} />
          <TableRowSkeleton columns={4} />
          <TableRowSkeleton columns={4} />
        </tbody>
      </table>
    </div>
  ),
};

export const MixedLoadingStates: Story = {
  render: () => (
    <div className="space-y-8 max-w-2xl">
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Dashboard Loading</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border rounded p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="border rounded p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="border rounded p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <LoadingState message="Loading recent activity..." />
      </div>
    </div>
  ),
};