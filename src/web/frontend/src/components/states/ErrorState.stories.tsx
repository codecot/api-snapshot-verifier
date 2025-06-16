import type { Meta, StoryObj } from '@storybook/react';
import { ErrorState, ErrorBoundary } from './ErrorState';
import { ApiException } from '@/api/base/errors';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Components/States/ErrorState',
  component: ErrorState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: 'Something went wrong. Please try again.',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const WithErrorObject: Story = {
  args: {
    error: new Error('Failed to fetch data from the server'),
    onRetry: () => console.log('Retry clicked'),
  },
};

export const NetworkError: Story = {
  args: {
    error: new ApiException('Failed to connect to the server', 0, true, false),
    onRetry: () => console.log('Retry clicked'),
  },
};

export const AuthenticationError: Story = {
  args: {
    error: new ApiException('Your session has expired. Please log in again.', 401, false, true),
    onRetry: () => console.log('Retry clicked'),
  },
};

export const WithDetails: Story = {
  args: {
    error: new ApiException(
      'Failed to create endpoint',
      400,
      false,
      false,
      {
        field: 'url',
        reason: 'Invalid URL format',
        suggestion: 'Please ensure the URL includes the protocol (http:// or https://)',
      }
    ),
    showDetails: true,
    onRetry: () => console.log('Retry clicked'),
  },
};

export const WithBothActions: Story = {
  args: {
    error: '404 - Page not found',
    onRetry: () => console.log('Retry clicked'),
    onGoHome: () => console.log('Go home clicked'),
  },
};

export const CustomClassName: Story = {
  args: {
    error: 'Custom styled error state',
    className: 'bg-red-50 dark:bg-red-950/20 rounded-lg p-8',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const ApiErrors: Story = {
  render: () => (
    <div className="space-y-8">
      <ErrorState
        error={new ApiException('Bad Request - Invalid parameters', 400)}
        onRetry={() => console.log('Retry 400')}
      />
      <ErrorState
        error={new ApiException('Unauthorized - Please log in', 401, false, true)}
        onRetry={() => console.log('Retry 401')}
      />
      <ErrorState
        error={new ApiException('Forbidden - You do not have permission', 403)}
        onRetry={() => console.log('Retry 403')}
      />
      <ErrorState
        error={new ApiException('Not Found - The resource does not exist', 404)}
        onRetry={() => console.log('Retry 404')}
      />
      <ErrorState
        error={new ApiException('Server Error - Please try again later', 500)}
        onRetry={() => console.log('Retry 500')}
      />
    </div>
  ),
};

// Error Boundary demonstration
const ThrowError = () => {
  throw new Error('This is a simulated error!');
};

export const ErrorBoundaryDemo: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click the button to trigger an error that will be caught by the ErrorBoundary
      </p>
      <ErrorBoundary>
        <Button onClick={() => {
          // Force a re-render that will throw
          const div = document.getElementById('error-trigger');
          if (div) {
            div.innerHTML = '<ThrowError />';
          }
        }}>
          Trigger Error
        </Button>
        <div id="error-trigger" />
      </ErrorBoundary>
    </div>
  ),
};

export const RealWorldScenarios: Story = {
  render: () => (
    <div className="space-y-8 max-w-2xl">
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">API Connection Failed</h3>
        <ErrorState
          error={new ApiException(
            'Unable to connect to the API server. Please check your internet connection.',
            0,
            true,
            false
          )}
          onRetry={() => console.log('Retry connection')}
        />
      </div>
      
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Import Failed</h3>
        <ErrorState
          error={new ApiException(
            'Failed to import OpenAPI specification',
            422,
            false,
            false,
            {
              line: 45,
              column: 12,
              message: 'Invalid schema format',
              path: '/paths/users/get/responses'
            }
          )}
          showDetails={true}
          onRetry={() => console.log('Retry import')}
        />
      </div>
      
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Snapshot Comparison Failed</h3>
        <ErrorState
          error="The snapshots could not be compared because one or both files are missing."
          onRetry={() => console.log('Retry comparison')}
          onGoHome={() => console.log('Go to snapshots')}
        />
      </div>
    </div>
  ),
};