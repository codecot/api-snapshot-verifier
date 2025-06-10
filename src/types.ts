export interface ApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface ApiSnapshot {
  endpoint: ApiEndpoint;
  timestamp: string;
  response: {
    status: number;
    headers: Record<string, string>;
    data: any;
    duration: number;
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