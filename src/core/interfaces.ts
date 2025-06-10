import { ApiEndpoint, ApiSnapshot, SnapshotComparison, SnapshotDiff, Config, ValidationResult, ApiSchema } from '../types.js';

// HTTP Client Interface
export interface HttpClient {
  request(config: RequestConfig): Promise<HttpResponse>;
}

export interface RequestConfig {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  duration: number;
}

// Storage Provider Interface
export interface StorageProvider {
  saveSnapshot(snapshot: ApiSnapshot, baseline?: boolean): Promise<string>;
  loadSnapshot(path: string): Promise<ApiSnapshot>;
  listSnapshots(endpointName?: string): Promise<string[]>;
  deleteSnapshot(path: string): Promise<void>;
  cleanupSnapshots(endpointName: string, keepCount: number): Promise<number>;
}

// Diff Engine Interface
export interface DiffProvider {
  name: string;
  compare(baseline: ApiSnapshot, current: ApiSnapshot, rules?: DiffRule[]): SnapshotComparison;
  generateTextDiff?(baseline: ApiSnapshot, current: ApiSnapshot): string;
}

export interface DiffRule {
  path: string;
  ignore?: boolean;
  severity?: 'breaking' | 'non-breaking' | 'informational';
}

// Auth Provider Interface
export interface AuthProvider {
  name: string;
  type: string;
  configure(config: any): Promise<void>;
  authenticate(request: RequestConfig): Promise<RequestConfig>;
  validateConfig(config: any): boolean;
}

// Output Formatter Interface
export interface OutputFormatter {
  name: string;
  format(comparisons: SnapshotComparison[], options?: FormatOptions): string;
  supportsOptions?(options: string[]): boolean;
}

export interface FormatOptions {
  details?: boolean;
  onlyBreaking?: boolean;
  summary?: boolean;
  [key: string]: any;
}

// Schema Validator Interface
export interface SchemaValidator {
  name: string;
  type: string;
  loadSchema(source: string): Promise<any>;
  validateRequest(data: any, schema: any): Promise<ValidationResult>;
  validateResponse(data: any, statusCode: number, schema: any): Promise<ValidationResult>;
  generateEndpoints?(schemaPath: string, baseUrl?: string): Promise<ApiEndpoint[]>;
}

// Command Interface
export interface Command {
  name: string;
  description: string;
  options: CommandOption[];
  execute(options: any, context: CommandContext): Promise<void>;
}

export interface CommandOption {
  flags: string;
  description: string;
  defaultValue?: any;
}

export interface CommandContext {
  container: import('./container.js').Container;
  config?: Config;
  logger: Logger;
}

// Plugin Interface
export interface Plugin {
  name: string;
  version: string;
  type: PluginType;
  initialize(context: PluginContext): Promise<void>;
  shutdown?(): Promise<void>;
}

export type PluginType = 'auth' | 'storage' | 'diff' | 'formatter' | 'schema' | 'command';

export interface PluginContext {
  container: import('./container.js').Container;
  config: Config;
  logger: Logger;
}

// Registry Interfaces
export interface Registry<T> {
  register(name: string, item: T): void;
  get(name: string): T | undefined;
  getAll(): Record<string, T>;
  has(name: string): boolean;
  remove(name: string): boolean;
  clear(): void;
}

// Logger Interface
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Service Orchestrator Interface
export interface SnapshotService {
  captureSnapshot(endpoint: ApiEndpoint): Promise<{ success: boolean; snapshot?: ApiSnapshot; error?: string; }>;
  captureAll(baseline?: boolean): Promise<{ success: boolean; snapshot?: ApiSnapshot; error?: string; }[]>;
  compareSnapshots(endpointName: string): Promise<SnapshotComparison | null>;
  compareAll(): Promise<(SnapshotComparison | null)[]>;
  listSnapshots(endpointName?: string): Promise<string[]>;
  cleanupSnapshots(endpointName?: string, keepCount?: number): Promise<number>;
}