import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
import { useState } from 'react';

const meta = {
  title: 'Components/UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const SelectDemo = () => {
  const [value, setValue] = useState<string>('');

  return (
    <div className="w-[200px]">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
          <SelectItem value="grape">Grape</SelectItem>
          <SelectItem value="watermelon">Watermelon</SelectItem>
        </SelectContent>
      </Select>
      {value && (
        <p className="mt-2 text-sm text-muted-foreground">
          Selected: {value}
        </p>
      )}
    </div>
  );
};

export const Default: Story = {
  render: () => <SelectDemo />,
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
          <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
          <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
          <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe & Africa</SelectLabel>
          <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
          <SelectItem value="cet">Central European Time (CET)</SelectItem>
          <SelectItem value="eet">Eastern European Time (EET)</SelectItem>
          <SelectItem value="west">Western European Summer Time (WEST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Asia</SelectLabel>
          <SelectItem value="ist">India Standard Time (IST)</SelectItem>
          <SelectItem value="cst_china">China Standard Time (CST)</SelectItem>
          <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
          <SelectItem value="kst">Korea Standard Time (KST)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDisabledItems: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a plan" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="free">Free</SelectItem>
        <SelectItem value="pro">Pro</SelectItem>
        <SelectItem value="enterprise" disabled>
          Enterprise (Coming Soon)
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const LongList: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a country" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="us">United States</SelectItem>
        <SelectItem value="ca">Canada</SelectItem>
        <SelectItem value="mx">Mexico</SelectItem>
        <SelectItem value="gb">United Kingdom</SelectItem>
        <SelectItem value="de">Germany</SelectItem>
        <SelectItem value="fr">France</SelectItem>
        <SelectItem value="it">Italy</SelectItem>
        <SelectItem value="es">Spain</SelectItem>
        <SelectItem value="br">Brazil</SelectItem>
        <SelectItem value="ar">Argentina</SelectItem>
        <SelectItem value="jp">Japan</SelectItem>
        <SelectItem value="cn">China</SelectItem>
        <SelectItem value="in">India</SelectItem>
        <SelectItem value="au">Australia</SelectItem>
        <SelectItem value="nz">New Zealand</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const ApiEndpointSelect: Story = {
  render: () => {
    const [endpoint, setEndpoint] = useState<string>('all');

    return (
      <div className="space-y-4">
        <Select value={endpoint} onValueChange={setEndpoint}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Filter by endpoint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Endpoints</SelectItem>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>User APIs</SelectLabel>
              <SelectItem value="get-users">GET /api/users</SelectItem>
              <SelectItem value="get-user-id">GET /api/users/:id</SelectItem>
              <SelectItem value="post-users">POST /api/users</SelectItem>
              <SelectItem value="put-user-id">PUT /api/users/:id</SelectItem>
              <SelectItem value="delete-user-id">DELETE /api/users/:id</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Product APIs</SelectLabel>
              <SelectItem value="get-products">GET /api/products</SelectItem>
              <SelectItem value="get-product-id">GET /api/products/:id</SelectItem>
              <SelectItem value="post-products">POST /api/products</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>System APIs</SelectLabel>
              <SelectItem value="health-check">GET /health</SelectItem>
              <SelectItem value="metrics">GET /metrics</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {endpoint !== 'all' && (
          <p className="text-sm text-muted-foreground">
            Filtering snapshots for: <code className="font-mono">{endpoint}</code>
          </p>
        )}
      </div>
    );
  },
};

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="option2">
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2 (Default)</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const CustomWidth: Story = {
  render: () => (
    <div className="space-y-4">
      <Select>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Narrow" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">One</SelectItem>
          <SelectItem value="2">Two</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Medium width select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option One</SelectItem>
          <SelectItem value="2">Option Two</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="w-[400px]">
          <SelectValue placeholder="Wide select for longer content" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">This is a very long option that demonstrates text wrapping</SelectItem>
          <SelectItem value="2">Another long option with descriptive text</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};