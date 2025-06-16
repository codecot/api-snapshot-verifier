import React from 'react';
import { X, Plus, Trash2, Edit3, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { COMMON_HEADERS, isPlaceholderValue } from '@/constants/headers';
import { getParameterSummary } from '@/utils/parameterParser';
import { hasUnresolvedParameters, resolveEndpointParameters } from '@/utils/parameterSubstitution';
import type { ApiEndpoint } from '@/types';

// Request Body Field Component
interface RequestBodyFieldProps {
  body: string;
  headers: Record<string, any>;
  onChange: (body: string) => void;
  onClear: () => void;
}

export function RequestBodyField({ body, headers, onChange, onClear }: RequestBodyFieldProps) {
  const contentType = headers?.['Content-Type'] || headers?.['content-type'];
  
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Request Body</label>
        {body && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
            title="Clear body content"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      
      {renderBodyField(body, contentType, onChange)}
      
      {!contentType && (
        <p className="text-xs text-gray-500 mt-1">
          Content-Type header will be auto-detected: JSON, XML, form data, CSV, HTML, or plain text.
        </p>
      )}
    </div>
  );
}

function renderBodyField(body: string, contentType: string | undefined, onChange: (body: string) => void) {
  if (contentType === 'multipart/form-data') {
    return (
      <div className="mt-1 p-3 border border-gray-300 rounded-md bg-blue-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-blue-700 font-medium">Multipart Form Data</span>
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            File uploads supported
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
          placeholder='--boundary\nContent-Disposition: form-data; name="field1"\n\nvalue1\n--boundary\nContent-Disposition: form-data; name="file"; filename="example.txt"\nContent-Type: text/plain\n\nfile content here\n--boundary--'
          rows={6}
        />
        <p className="text-xs text-blue-600 mt-1">
          💡 Use multipart format with boundaries for file uploads and form fields
        </p>
      </div>
    );
  }

  if (contentType === 'application/x-www-form-urlencoded') {
    return (
      <div className="mt-1 p-3 border border-gray-300 rounded-md bg-yellow-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-yellow-700 font-medium">URL Encoded Form</span>
          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
            key=value pairs
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
          placeholder="key1=value1&key2=value2&email=user@example.com"
          rows={3}
        />
        <p className="text-xs text-yellow-600 mt-1">
          💡 Format: key=value pairs separated by &
        </p>
      </div>
    );
  }

  if (contentType?.includes('json')) {
    return (
      <div className="mt-1 p-3 border border-gray-300 rounded-md bg-green-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-green-700 font-medium">JSON Data</span>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
            application/json
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground font-mono"
          placeholder='{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "age": 30\n}'
          rows={4}
        />
        <p className="text-xs text-green-600 mt-1">
          💡 Valid JSON format with proper syntax
        </p>
      </div>
    );
  }

  if (contentType?.includes('xml')) {
    return (
      <div className="mt-1 p-3 border border-gray-300 rounded-md bg-purple-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-purple-700 font-medium">XML Data</span>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
            application/xml
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground font-mono"
          placeholder='<?xml version="1.0" encoding="UTF-8"?>\n<user>\n  <name>John Doe</name>\n  <email>john@example.com</email>\n  <age>30</age>\n</user>'
          rows={5}
        />
        <p className="text-xs text-purple-600 mt-1">
          💡 Well-formed XML with proper tags and encoding
        </p>
      </div>
    );
  }

  // Default textarea
  return (
    <textarea
      value={body}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder='{"key": "value"} or <xml>data</xml> or key=value&key2=value2'
      rows={4}
    />
  );
}

// Headers Section Component
interface HeadersSectionProps {
  headers: Record<string, any>;
  newHeaderKey: string;
  newHeaderValue: string;
  isCustomHeader: boolean;
  isCustomValue: boolean;
  onHeaderKeyChange: (value: string) => void;
  onHeaderValueChange: (value: string) => void;
  onAddHeader: () => void;
  onRemoveHeader: (key: string) => void;
  setNewHeaderKey: (value: string) => void;
  setNewHeaderValue: (value: string) => void;
  setIsCustomHeader: (value: boolean) => void;
  setIsCustomValue: (value: boolean) => void;
}

export function HeadersSection({
  headers,
  newHeaderKey,
  newHeaderValue,
  isCustomHeader,
  isCustomValue,
  onHeaderKeyChange,
  onHeaderValueChange,
  onAddHeader,
  onRemoveHeader,
  setNewHeaderKey,
  setNewHeaderValue,
  setIsCustomHeader,
  setIsCustomValue,
}: HeadersSectionProps) {
  return (
    <div>
      <label className="text-sm font-medium">Headers</label>
      <div className="mt-2 space-y-2">
        {/* Existing headers */}
        {Object.entries(headers || {}).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="flex-1 flex gap-1">
              <span className="w-32 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-700 font-medium">
                {key}
              </span>
              <span className="flex-1 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-600 font-mono">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveHeader(key)}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-red-50 hover:bg-red-100 text-red-600"
              title="Remove header"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add new header */}
        <div className="space-y-2">
          {!newHeaderKey && !isCustomHeader ? (
            <div className="flex items-center gap-1">
              <div className="flex-1 flex gap-1">
                <select
                  value=""
                  onChange={(e) => onHeaderKeyChange(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select header to add...</option>
                  {Object.keys(COMMON_HEADERS).map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <HeaderInput
              newHeaderKey={newHeaderKey}
              newHeaderValue={newHeaderValue}
              isCustomHeader={isCustomHeader}
              isCustomValue={isCustomValue}
              onHeaderKeyChange={setNewHeaderKey}
              onHeaderValueChange={onHeaderValueChange}
              onAddHeader={onAddHeader}
              onResetHeader={() => {
                setNewHeaderKey('');
                setNewHeaderValue('');
                setIsCustomHeader(false);
                setIsCustomValue(false);
              }}
              setIsCustomValue={setIsCustomValue}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Header Input Component
interface HeaderInputProps {
  newHeaderKey: string;
  newHeaderValue: string;
  isCustomHeader: boolean;
  isCustomValue: boolean;
  onHeaderKeyChange: (value: string) => void;
  onHeaderValueChange: (value: string) => void;
  onAddHeader: () => void;
  onResetHeader: () => void;
  setIsCustomValue: (value: boolean) => void;
}

function HeaderInput({
  newHeaderKey,
  newHeaderValue,
  isCustomHeader,
  isCustomValue,
  onHeaderKeyChange,
  onHeaderValueChange,
  onAddHeader,
  onResetHeader,
  setIsCustomValue,
}: HeaderInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (newHeaderKey.trim() && newHeaderValue.trim()) {
        onAddHeader();
      }
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 flex gap-1">
        {/* Header name */}
        {isCustomHeader ? (
          <input
            type="text"
            placeholder="Custom header name"
            value={newHeaderKey}
            onChange={(e) => onHeaderKeyChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span className="w-32 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-700 font-medium flex items-center">
            {newHeaderKey}
          </span>
        )}

        {/* Header value */}
        <HeaderValueInput
          headerKey={newHeaderKey}
          value={newHeaderValue}
          isCustomValue={isCustomValue}
          isCustomHeader={isCustomHeader}
          onChange={onHeaderValueChange}
          onKeyDown={handleKeyDown}
          setIsCustomValue={setIsCustomValue}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onAddHeader}
          disabled={!newHeaderKey.trim() || !newHeaderValue.trim()}
          className={`px-2 py-1.5 text-xs border border-gray-300 rounded shrink-0 ${
            newHeaderKey.trim() && newHeaderValue.trim()
              ? 'border-green-500 text-green-600 hover:bg-green-50'
              : 'border-gray-300 text-gray-400'
          }`}
          title={
            newHeaderKey.trim() && newHeaderValue.trim()
              ? 'Add header'
              : 'Enter header value'
          }
        >
          <Plus className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={onResetHeader}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-red-50 hover:bg-red-100 text-red-600"
          title="Cancel header"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// Header Value Input Component
interface HeaderValueInputProps {
  headerKey: string;
  value: string;
  isCustomValue: boolean;
  isCustomHeader: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  setIsCustomValue: (value: boolean) => void;
}

function HeaderValueInput({
  headerKey,
  value,
  isCustomValue,
  isCustomHeader,
  onChange,
  onKeyDown,
  setIsCustomValue,
}: HeaderValueInputProps) {
  const suggestions = COMMON_HEADERS[headerKey];
  const showDropdown = !isCustomValue && !isCustomHeader && suggestions && suggestions.length > 0;

  if (showDropdown) {
    return (
      <div className="flex gap-1 flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select value...</option>
          {suggestions.map((suggestion, index) => (
            <option key={index} value={suggestion}>
              {suggestion}
            </option>
          ))}
          <option value="__CUSTOM__">💭 Custom value...</option>
        </select>
        
        {value && isPlaceholderValue(value) && (
          <button
            type="button"
            onClick={() => setIsCustomValue(true)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-blue-50 hover:bg-blue-100 text-blue-600"
            title="Edit this value"
          >
            <Edit3 className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-1 flex-1">
      <input
        type="text"
        placeholder="Header value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          if (isPlaceholderValue(value)) {
            e.target.select();
          }
        }}
        onKeyDown={onKeyDown}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        autoFocus={isCustomValue}
      />
      
      {isCustomValue && !isCustomHeader && suggestions && (
        <button
          type="button"
          onClick={() => {
            setIsCustomValue(false);
            onChange(suggestions[0] || '');
          }}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-600"
          title="Back to templates"
        >
          ↺
        </button>
      )}
    </div>
  );
}

// Parameters Section Component
interface ParametersSectionProps {
  endpointParams: any;
  formData: ApiEndpoint;
  showParameters: boolean;
  onToggleParameters: () => void;
  onParameterChange: (paramName: string, value: string) => void;
  onResetParameter: (paramName: string) => void;
  onResetAllParameters: () => void;
}

export function ParametersSection({
  endpointParams,
  formData,
  showParameters,
  onToggleParameters,
  onParameterChange,
  onResetParameter,
  onResetAllParameters,
}: ParametersSectionProps) {
  return (
    <div>
      <div
        className="flex items-center justify-between cursor-pointer py-2 border-b border-gray-200"
        onClick={onToggleParameters}
      >
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Parameters</label>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {getParameterSummary(endpointParams)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResetAllParameters();
            }}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
            title="Regenerate all parameter values"
          >
            <Settings className="h-3 w-3" />
          </button>
          {showParameters ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>

      {showParameters && (
        <div className="mt-3 space-y-3">
          {/* Live URL Preview */}
          {hasUnresolvedParameters(formData) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-xs font-medium text-yellow-700 mb-1">
                Live Preview:
              </div>
              <div className="text-xs font-mono text-yellow-800 break-all">
                {resolveEndpointParameters(formData).url}
              </div>
            </div>
          )}

          {/* Parameter Inputs */}
          <div className="grid grid-cols-1 gap-2">
            {endpointParams &&
              Object.entries(endpointParams.parameters).map(
                ([paramName, paramConfig]: [string, any]) => {
                  const currentValue = formData.parameters?.[paramName] || paramConfig.value;

                  return (
                    <div
                      key={paramName}
                      className="grid grid-cols-4 gap-2 items-center text-sm"
                    >
                      {/* Parameter Name */}
                      <div className="flex flex-col">
                        <span className="font-mono text-gray-700">{paramName}</span>
                        <span className="text-xs text-gray-500">
                          {typeof paramConfig.pattern === 'object'
                            ? JSON.stringify(paramConfig.pattern)
                            : String(paramConfig.pattern || '')}
                        </span>
                      </div>

                      {/* Parameter Value Input */}
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => onParameterChange(paramName, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={paramConfig.value}
                        />
                      </div>

                      {/* Sources & Actions */}
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs text-gray-500"
                          title={`Used in: ${
                            Array.isArray(paramConfig.sources)
                              ? paramConfig.sources.join(', ')
                              : String(paramConfig.sources || '')
                          }`}
                        >
                          {Array.isArray(paramConfig.sources)
                            ? paramConfig.sources.join(', ').substring(0, 10) +
                              (paramConfig.sources.join(', ').length > 10 ? '...' : '')
                            : String(paramConfig.sources || '').substring(0, 10)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onResetParameter(paramName)}
                          className="text-xs text-blue-600 hover:text-blue-800 px-1 py-0.5 rounded hover:bg-blue-50"
                          title="Reset to space-consistent value"
                        >
                          ↻
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
          </div>

          {/* Parameter Help */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 Parameters like <code>{'{userId}'}</code> are automatically detected and can be used
            in URL, headers, and request body. Smart defaults are generated based on parameter names.
          </div>
        </div>
      )}
    </div>
  );
}