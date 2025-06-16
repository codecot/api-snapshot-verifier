import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast, toast as toastLib } from './toast';
import { Button } from './button';
import { useEffect } from 'react';

const meta = {
  title: 'Components/UI/Toast',
  component: ToastProvider,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

// Demo component that uses the toast hook
const ToastDemo = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => toast.success('Operation completed successfully!')}
          variant="outline"
          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
        >
          Show Success Toast
        </Button>
        
        <Button 
          onClick={() => toast.error('Something went wrong. Please try again.')}
          variant="outline"
          className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
        >
          Show Error Toast
        </Button>
        
        <Button 
          onClick={() => toast.info('New update available. Click to refresh.')}
          variant="outline"
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
        >
          Show Info Toast
        </Button>
        
        <Button 
          onClick={() => {
            toast.loading('Processing your request...', { id: 'loading-demo' });
            setTimeout(() => {
              toast.success('Request completed!', { id: 'loading-demo' });
            }, 3000);
          }}
          variant="outline"
          className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300"
        >
          Show Loading Toast
        </Button>
      </div>
      
      <Button 
        onClick={() => toast.dismiss()}
        variant="secondary"
        className="w-full"
      >
        Dismiss All Toasts
      </Button>
    </div>
  );
};

export const Default: Story = {
  render: () => <ToastDemo />,
};

// Custom duration demo
const DurationDemo = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <Button 
        onClick={() => toast.info('This toast will disappear in 1 second', { duration: 1000 })}
      >
        1 Second Toast
      </Button>
      
      <Button 
        onClick={() => toast.info('This toast will disappear in 5 seconds', { duration: 5000 })}
      >
        5 Second Toast
      </Button>
      
      <Button 
        onClick={() => toast.info('This toast won\'t auto-dismiss', { duration: 0 })}
      >
        Persistent Toast
      </Button>
    </div>
  );
};

export const CustomDuration: Story = {
  render: () => <DurationDemo />,
};

// Toast with action demo
const ActionDemo = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <Button 
        onClick={() => 
          toast.error('Failed to save changes', {
            action: {
              label: 'Retry',
              onClick: () => {
                console.log('Retry clicked');
                toast.success('Changes saved successfully!');
              }
            }
          })
        }
      >
        Error with Retry Action
      </Button>
      
      <Button 
        onClick={() => 
          toast.error('Connection lost', {
            duration: 0,
            action: {
              label: 'Reconnect',
              onClick: () => {
                console.log('Reconnect clicked');
                toast.loading('Reconnecting...', { id: 'reconnect' });
                setTimeout(() => {
                  toast.success('Connected!', { id: 'reconnect' });
                }, 2000);
              }
            }
          })
        }
      >
        Connection Error with Action
      </Button>
    </div>
  );
};

export const WithActions: Story = {
  render: () => <ActionDemo />,
};

// Multiple toasts demo
const MultipleToastsDemo = () => {
  const { toast } = useToast();

  const showMultipleToasts = () => {
    toast.success('File uploaded successfully');
    setTimeout(() => toast.info('Processing file...'), 500);
    setTimeout(() => toast.success('File processed'), 1000);
    setTimeout(() => toast.info('Sending notifications...'), 1500);
  };

  return (
    <Button onClick={showMultipleToasts}>
      Show Multiple Toasts
    </Button>
  );
};

export const MultipleToasts: Story = {
  render: () => <MultipleToastsDemo />,
};

// Real-world scenarios
const RealWorldDemo = () => {
  const { toast } = useToast();

  const simulateApiCall = async () => {
    toast.loading('Creating API endpoint...', { id: 'api-create' });
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/failure
      if (Math.random() > 0.5) {
        toast.success('Endpoint created successfully!', { id: 'api-create' });
      } else {
        throw new Error('Failed to create endpoint');
      }
    } catch (error) {
      toast.error('Failed to create endpoint', {
        id: 'api-create',
        action: {
          label: 'Try Again',
          onClick: simulateApiCall
        }
      });
    }
  };

  const simulateImport = async () => {
    toast.loading('Importing OpenAPI specification...', { id: 'import', duration: 0 });
    
    // Simulate progress updates
    setTimeout(() => {
      toast.loading('Parsing endpoints...', { id: 'import', duration: 0 });
    }, 1000);
    
    setTimeout(() => {
      toast.loading('Validating schema...', { id: 'import', duration: 0 });
    }, 2000);
    
    setTimeout(() => {
      toast.success('Successfully imported 12 endpoints!', { id: 'import' });
    }, 3000);
  };

  const simulateSnapshot = () => {
    toast.info('Snapshot capture started', { duration: 2000 });
    
    setTimeout(() => {
      toast.success('Snapshot captured for 5 endpoints');
    }, 2500);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">API Operations</h3>
      
      <Button onClick={simulateApiCall} className="w-full">
        Create Endpoint (Random Success/Fail)
      </Button>
      
      <Button onClick={simulateImport} variant="outline" className="w-full">
        Import OpenAPI Spec
      </Button>
      
      <Button onClick={simulateSnapshot} variant="secondary" className="w-full">
        Capture Snapshot
      </Button>
    </div>
  );
};

export const RealWorldScenarios: Story = {
  render: () => <RealWorldDemo />,
};

// Toast update demo
const UpdateDemo = () => {
  const { toast } = useToast();

  const updateableToast = () => {
    toast.loading('Step 1: Initializing...', { id: 'update-demo', duration: 0 });
    
    setTimeout(() => {
      toast.loading('Step 2: Processing data...', { id: 'update-demo', duration: 0 });
    }, 1500);
    
    setTimeout(() => {
      toast.loading('Step 3: Finalizing...', { id: 'update-demo', duration: 0 });
    }, 3000);
    
    setTimeout(() => {
      toast.success('Process completed successfully!', { id: 'update-demo' });
    }, 4500);
  };

  return (
    <Button onClick={updateableToast}>
      Show Updating Toast
    </Button>
  );
};

export const UpdatingToast: Story = {
  render: () => <UpdateDemo />,
};