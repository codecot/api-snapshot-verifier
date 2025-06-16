import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80">
        Active
      </Badge>
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80">
        Pending
      </Badge>
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100/80">
        Error
      </Badge>
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100/80">
        Info
      </Badge>
    </div>
  ),
};

export const EnvironmentBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
        Production
      </Badge>
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
        Staging
      </Badge>
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
        Development
      </Badge>
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
        Local
      </Badge>
    </div>
  ),
};

export const WithDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="gap-1">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Online
      </Badge>
      <Badge variant="secondary" className="gap-1">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        Away
      </Badge>
      <Badge variant="outline" className="gap-1">
        <span className="h-2 w-2 rounded-full bg-gray-500" />
        Offline
      </Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge className="text-xs py-0 px-2">Extra Small</Badge>
      <Badge className="text-sm">Small</Badge>
      <Badge>Default</Badge>
      <Badge className="text-base py-1 px-3">Large</Badge>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="cursor-pointer hover:bg-primary/90">
        Clickable
      </Badge>
      <Badge variant="outline" className="group cursor-pointer">
        <span className="group-hover:underline">Hover me</span>
      </Badge>
      <Badge className="transition-transform hover:scale-105 cursor-pointer">
        Scalable
      </Badge>
    </div>
  ),
};