import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HTTP_METHOD, HTTP_METHODS, supportsBody } from '@/constants/httpMethods';
import { COMMON_HEADERS, isPlaceholderValue, detectContentType } from '@/constants/headers';
import { parseEndpointParameters } from '@/utils/parameterParser';
import { getSpaceParameterManager } from '@/utils/spaceParameterManager';
import { useSpace } from '@/contexts/SpaceContext';
import { RequestBodyField, HeadersSection, ParametersSection } from './EndpointFormComponents';
import type { ApiEndpoint } from '@/types';
import toast from '@/components/ui/toast';

export interface EndpointFormProps {
  endpoint?: ApiEndpoint | null;
  endpoints: ApiEndpoint[];
  onSave: (endpoint: ApiEndpoint) => void;
  onCancel: () => void;
  isLoading: boolean;
}

/**
 * Endpoint creation/editing form component
 */
export function EndpointForm({
  endpoint,
  endpoints,
  onSave,
  onCancel,
  isLoading,
}: EndpointFormProps) {
  const { currentSpace } = useSpace();
  const spaceParameterManager = getSpaceParameterManager(currentSpace);

  const [formData, setFormData] = useState<ApiEndpoint>({
    name: endpoint?.name || '',
    url: endpoint?.url || '',
    method: endpoint?.method || HTTP_METHOD.GET,
    headers: endpoint?.headers || {},
    body: endpoint?.body || '',
    auth: endpoint?.auth || {},
    parameters: endpoint?.parameters || {},
  });

  // Form state
  const isDuplicated = endpoint?.name?.includes(' - Copy');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');
  const [isCustomHeader, setIsCustomHeader] = useState(false);
  const [isCustomValue, setIsCustomValue] = useState(false);
  const [preservedBody, setPreservedBody] = useState(endpoint?.body || '');
  const [showParameters, setShowParameters] = useState(false);
  const [endpointParams, setEndpointParams] = useState<any>(null);

  // Handle ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  // Initialize preserved body when editing existing endpoint
  useEffect(() => {
    if (endpoint?.body && supportsBody(endpoint.method)) {
      setPreservedBody(endpoint.body);
    }
  }, [endpoint]);

  // Parse parameters whenever URL, headers, or body changes
  useEffect(() => {
    const parsed = parseEndpointParameters({
      url: formData.url,
      headers: formData.headers,
      body: formData.body,
    });

    setEndpointParams(parsed);

    // Auto-expand parameters section if parameters are detected
    if (parsed.totalCount > 0 && !showParameters) {
      setShowParameters(true);
    }

    // Use space-consistent parameter values
    if (parsed.totalCount > 0) {
      const spaceConsistentParams = spaceParameterManager.mergeEndpointParameters({
        ...formData,
        url: formData.url,
        headers: formData.headers,
        body: formData.body,
      });

      // Update form data if parameters changed
      if (JSON.stringify(spaceConsistentParams) !== JSON.stringify(formData.parameters)) {
        console.log(`🎯 Updated endpoint "${formData.name}" with space-consistent parameters:`, spaceConsistentParams);
        setFormData((prev) => ({ ...prev, parameters: spaceConsistentParams }));
      }
    } else {
      // No parameters detected, clear parameter field
      if (Object.keys(formData.parameters || {}).length > 0) {
        setFormData((prev) => ({ ...prev, parameters: {} }));
      }
    }
  }, [formData.url, formData.headers, formData.body, currentSpace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Trim all string fields
    const trimmedData: ApiEndpoint = {
      ...formData,
      name: formData.name.trim(),
      url: formData.url.trim(),
      method: formData.method,
      body: formData.body?.trim() || '',
      headers: Object.fromEntries(
        Object.entries(formData.headers || {}).map(([key, value]) => [
          key.trim(),
          String(value).trim(),
        ])
      ),
      auth: formData.auth
        ? {
            ...formData.auth,
            type: formData.auth.type?.trim(),
            token: formData.auth.token?.trim(),
          }
        : undefined,
    };

    if (!trimmedData.name || !trimmedData.url) {
      toast.error('Name and URL are required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = endpoint?.name?.includes(' - Copy');
    const isEditingWithSameName = endpoint && !isDuplicate && endpoint.name === trimmedData.name;

    if (!isEditingWithSameName) {
      const existingEndpoint = endpoints.find((e) => e.name === trimmedData.name);
      if (existingEndpoint) {
        toast.error(`Endpoint name "${trimmedData.name}" already exists`);
        return;
      }
    }

    // Optional: Warn about duplicate URLs
    const duplicateUrl = endpoints.find(
      (e) => e.url === trimmedData.url && e.method === trimmedData.method
    );
    if (duplicateUrl && duplicateUrl.name !== endpoint?.name) {
      if (!confirm(
        `The URL and method are already used by "${duplicateUrl.name}". Create "${trimmedData.name}" anyway?`
      )) {
        return;
      }
    }

    onSave(trimmedData);
  };

  const handleMethodChange = (newMethod: HTTP_METHOD) => {
    const oldMethod = formData.method;
    const hadBody = supportsBody(oldMethod);
    const willHaveBody = supportsBody(newMethod);

    let newBody = formData.body;
    let newHeaders = { ...formData.headers };

    if (hadBody && !willHaveBody && formData.body) {
      // Switching from body method to non-body method
      setPreservedBody(formData.body);
      newBody = '';

      // Remove Content-Type header
      delete newHeaders['Content-Type'];
      delete newHeaders['content-type'];

      toast(`Request body hidden - ${newMethod} requests don't use body (your content is preserved)`, {
        icon: 'ℹ️',
      });
    } else if (!hadBody && willHaveBody && preservedBody) {
      // Switching back to body method - restore preserved body
      newBody = preservedBody;
      toast.success('Request body restored');
    }

    setFormData({
      ...formData,
      method: newMethod,
      body: newBody,
      headers: newHeaders,
    });
  };

  const handleHeaderKeyChange = (value: string) => {
    if (value === 'Custom') {
      setNewHeaderKey('');
      setIsCustomHeader(true);
      setIsCustomValue(false);
      setNewHeaderValue('');
    } else {
      setNewHeaderKey(value);
      setIsCustomHeader(false);
      setIsCustomValue(false);

      // Auto-suggest first common value
      const suggestions = COMMON_HEADERS[value];
      if (suggestions && suggestions.length > 0) {
        setNewHeaderValue(suggestions[0]);
      } else {
        setNewHeaderValue('');
      }
    }
  };

  const handleHeaderValueChange = (value: string) => {
    if (value === '__CUSTOM__') {
      setIsCustomValue(true);
      setNewHeaderValue('');
    } else {
      setIsCustomValue(false);

      // If the value contains placeholder text, switch to custom input
      if (isPlaceholderValue(value)) {
        setIsCustomValue(true);
        setNewHeaderValue(value);
      } else {
        setNewHeaderValue(value);
      }
    }
  };

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      setFormData({
        ...formData,
        headers: {
          ...formData.headers,
          [newHeaderKey]: newHeaderValue,
        },
      });
      setNewHeaderKey('');
      setNewHeaderValue('');
      setIsCustomHeader(false);
      setIsCustomValue(false);
    }
  };

  const removeHeader = (key: string) => {
    const { [key]: removed, ...rest } = formData.headers || {};
    setFormData({ ...formData, headers: rest });
  };

  const handleBodyChange = (newBody: string) => {
    setFormData({ ...formData, body: newBody });
    setPreservedBody(newBody);

    // Auto-detect Content-Type
    if (
      newBody.trim() &&
      !formData.headers?.['Content-Type'] &&
      !formData.headers?.['content-type']
    ) {
      const suggestedContentType = detectContentType(newBody);
      if (suggestedContentType) {
        setFormData((prev) => ({
          ...prev,
          body: newBody,
          headers: {
            ...prev.headers,
            'Content-Type': suggestedContentType,
          },
        }));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {!endpoint
              ? 'Add Endpoint'
              : isDuplicated
              ? 'Duplicate Endpoint'
              : 'Edit Endpoint'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field */}
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="my-api-endpoint"
                autoFocus={isDuplicated}
                required
              />
            </div>

            {/* Method & URL */}
            <div>
              <label className="text-sm font-medium">Method & URL</label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.method}
                  onChange={(e) => handleMethodChange(e.target.value as HTTP_METHOD)}
                  className="w-24 px-2 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground text-sm"
                >
                  {HTTP_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.example.com/endpoint"
                  required
                />
              </div>
            </div>

            {/* Request Body */}
            {supportsBody(formData.method) && (
              <RequestBodyField
                body={formData.body}
                headers={formData.headers}
                preservedBody={preservedBody}
                onChange={handleBodyChange}
                onClear={() => {
                  setFormData({ ...formData, body: '' });
                  setPreservedBody('');
                }}
              />
            )}

            {/* Headers */}
            <HeadersSection
              headers={formData.headers}
              newHeaderKey={newHeaderKey}
              newHeaderValue={newHeaderValue}
              isCustomHeader={isCustomHeader}
              isCustomValue={isCustomValue}
              onHeaderKeyChange={handleHeaderKeyChange}
              onHeaderValueChange={handleHeaderValueChange}
              onAddHeader={addHeader}
              onRemoveHeader={removeHeader}
              setNewHeaderKey={setNewHeaderKey}
              setNewHeaderValue={setNewHeaderValue}
              setIsCustomHeader={setIsCustomHeader}
              setIsCustomValue={setIsCustomValue}
            />

            {/* Parameters */}
            {endpointParams && endpointParams.totalCount > 0 && (
              <ParametersSection
                endpointParams={endpointParams}
                formData={formData}
                showParameters={showParameters}
                onToggleParameters={() => setShowParameters(!showParameters)}
                onParameterChange={(paramName: string, value: string) => {
                  const newParams = { ...formData.parameters };
                  newParams[paramName] = value;
                  setFormData((prev) => ({ ...prev, parameters: newParams }));
                }}
                onResetParameter={(paramName: string) => {
                  spaceParameterManager.resetParameter(paramName);
                  const freshValue = spaceParameterManager.generateParameter(
                    paramName,
                    endpointParams.parameters[paramName].pattern
                  );
                  const newParams = { ...formData.parameters };
                  newParams[paramName] = freshValue;
                  setFormData((prev) => ({ ...prev, parameters: newParams }));
                  toast.success(`Parameter "${paramName}" reset to space-consistent value`);
                }}
                onResetAllParameters={() => {
                  for (const [paramName] of Object.entries(endpointParams.parameters)) {
                    spaceParameterManager.resetParameter(paramName);
                  }
                  const freshParams = spaceParameterManager.mergeEndpointParameters(formData);
                  setFormData((prev) => ({ ...prev, parameters: freshParams }));
                  toast.success('Space parameters regenerated consistently');
                }}
              />
            )}

            {/* Form Actions */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}