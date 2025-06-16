import type { Meta, StoryObj } from '@storybook/react';
import { JsonViewer, CompactJsonViewer } from './json-viewer';

const meta = {
  title: 'Components/UI/JsonViewer',
  component: JsonViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'select',
      options: ['light', 'dark', 'auto'],
    },
    defaultExpanded: {
      control: 'boolean',
    },
    maxHeight: {
      control: 'text',
    },
    searchTerm: {
      control: 'text',
    },
  },
} satisfies Meta<typeof JsonViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = {
  id: "snapshot_12345",
  endpoint: "get-users",
  timestamp: "2024-01-15T10:30:00Z",
  status: "success",
  method: "GET",
  url: "https://api.example.com/v1/users",
  responseStatus: 200,
  duration: 234,
  response: {
    users: [
      {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        active: true,
        roles: ["admin", "user"],
        metadata: {
          lastLogin: "2024-01-14T15:22:00Z",
          loginCount: 42
        }
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane@example.com",
        active: false,
        roles: ["user"],
        metadata: {
          lastLogin: "2024-01-10T09:15:00Z",
          loginCount: 18
        }
      }
    ],
    pagination: {
      page: 1,
      perPage: 20,
      total: 2,
      totalPages: 1
    },
    _meta: {
      timestamp: "2024-01-15T10:30:00Z",
      version: "1.0.0"
    }
  }
};

export const Default: Story = {
  args: {
    data: sampleData,
  },
};

export const SimpleData: Story = {
  args: {
    data: {
      name: "API Snapshot",
      version: "1.0.0",
      status: "active",
      endpoints: 15,
      lastUpdated: "2024-01-15T10:30:00Z"
    },
  },
};

export const ArrayData: Story = {
  args: {
    data: [
      { id: 1, name: "Item 1", value: 100 },
      { id: 2, name: "Item 2", value: 200 },
      { id: 3, name: "Item 3", value: 300 },
    ],
  },
};

export const NestedData: Story = {
  args: {
    data: {
      level1: {
        level2: {
          level3: {
            level4: {
              message: "Deeply nested value",
              items: [1, 2, 3, 4, 5]
            }
          }
        }
      }
    },
    defaultExpanded: true,
  },
};

export const LargeDataset: Story = {
  args: {
    data: {
      results: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 1000),
        status: Math.random() > 0.5 ? 'active' : 'inactive',
        metadata: {
          created: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
          tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `tag${j + 1}`)
        }
      })),
      summary: {
        total: 50,
        active: 25,
        inactive: 25
      }
    },
    maxHeight: '400px',
  },
};

export const WithSearchHighlight: Story = {
  args: {
    data: {
      users: [
        { name: "John Doe", email: "john@example.com", role: "admin" },
        { name: "Jane Smith", email: "jane@example.com", role: "user" },
        { name: "Bob Johnson", email: "bob@example.com", role: "admin" },
      ]
    },
    searchTerm: "admin",
    defaultExpanded: true,
  },
};

export const ErrorResponse: Story = {
  args: {
    data: {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: {
          field: "email",
          reason: "Invalid email format",
          value: "not-an-email"
        },
        timestamp: "2024-01-15T10:30:00Z",
        requestId: "req_12345"
      },
      status: 400
    },
    defaultExpanded: true,
  },
};

export const CompactViewerSimple: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div>
        <h3 className="text-sm font-medium mb-2">Compact JSON Viewer - Simple</h3>
        <CompactJsonViewer 
          data={{ status: "success", count: 42, message: "Operation completed" }}
          maxLines={2}
        />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Compact JSON Viewer - Expanded</h3>
        <CompactJsonViewer 
          data={{
            users: [
              { id: 1, name: "John", active: true },
              { id: 2, name: "Jane", active: false },
            ],
            meta: { total: 2, page: 1 }
          }}
          maxLines={3}
        />
      </div>
    </div>
  ),
};

export const DifferentThemes: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-2">Light Theme</h3>
        <div className="bg-white p-4 rounded">
          <JsonViewer 
            data={sampleData.response}
            theme="light"
            defaultExpanded={true}
            maxHeight="300px"
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Dark Theme</h3>
        <div className="bg-gray-900 p-4 rounded">
          <JsonViewer 
            data={sampleData.response}
            theme="dark"
            defaultExpanded={true}
            maxHeight="300px"
          />
        </div>
      </div>
    </div>
  ),
};

export const RealAPIResponse: Story = {
  args: {
    data: {
      data: {
        id: "prod_12345",
        attributes: {
          name: "Premium Subscription",
          price: {
            amount: 9999,
            currency: "USD",
            formatted: "$99.99"
          },
          features: [
            "Unlimited API calls",
            "Advanced analytics",
            "Priority support",
            "Custom integrations"
          ],
          metadata: {
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-15T10:30:00Z",
            version: 3
          }
        },
        relationships: {
          category: {
            data: { type: "categories", id: "cat_789" }
          },
          variants: {
            data: [
              { type: "variants", id: "var_123" },
              { type: "variants", id: "var_456" }
            ]
          }
        }
      },
      included: [
        {
          type: "categories",
          id: "cat_789",
          attributes: { name: "Software Subscriptions" }
        }
      ],
      meta: {
        requestId: "req_abc123",
        timestamp: "2024-01-15T10:30:00Z"
      }
    },
    defaultExpanded: false,
  },
};