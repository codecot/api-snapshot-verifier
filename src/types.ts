export interface ApiSchema {
  type: 'openapi' | 'json-schema' | 'graphql' | 'custom';
  source: string;
  version?: string;
  operationId?: string;
  requestValidation?: boolean;
  responseValidation?: boolean;
}

export interface ValidationError {
  path: string;
  message: string;
  expected?: any;
  actual?: any;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  schema?: ApiSchema;
  auth?: {
    type?: string;
    token?: string;
    config?: any;
  };
  // Universal parameter support - Phase 1
  parameters?: Record<string, string>;  // Resolved parameter values: { userId: "123", authToken: "abc" }
}

export interface ApiSnapshot {
  endpoint: ApiEndpoint;
  timestamp: string;
  request?: {
    validation?: ValidationResult;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    data: any;
    duration: number;
    validation?: ValidationResult;
  };
  metadata: {
    version: string;
    environment?: string;
  };
}

export interface SnapshotComparison {
  endpoint: string;
  baseline: ApiSnapshot;
  current: ApiSnapshot;
  differences: SnapshotDiff[];
  hasChanges: boolean;
}

export interface SnapshotDiff {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
  severity: 'breaking' | 'non-breaking' | 'informational';
}

export interface Config {
  endpoints: ApiEndpoint[];
  snapshotDir: string;
  baselineDir?: string;
  rules?: DiffRule[];
  environment?: string;
  space?: string; // Added to track the actual space name
  plugins?: {
    auth?: { providers: string[] };
    formatters?: { default: string };
    storage?: { provider: string };
    diff?: { engine: string };
  };
}

export interface DiffRule {
  path: string;
  ignore?: boolean;
  severity?: 'breaking' | 'non-breaking' | 'informational';
}

export interface SnapshotResult {
  success: boolean;
  snapshot?: ApiSnapshot;
  error?: string;
}