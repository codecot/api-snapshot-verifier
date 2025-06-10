export type ServiceFactory<T = any> = () => T | Promise<T>;
export type ServiceKey = string | symbol;

export interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

export interface Container {
  register<T>(key: ServiceKey, factory: ServiceFactory<T>, singleton?: boolean): void;
  registerSingleton<T>(key: ServiceKey, factory: ServiceFactory<T>): void;
  resolve<T>(key: ServiceKey): Promise<T>;
  has(key: ServiceKey): boolean;
  clear(): void;
}

export class DIContainer implements Container {
  private services = new Map<ServiceKey, ServiceDefinition>();

  register<T>(key: ServiceKey, factory: ServiceFactory<T>, singleton = false): void {
    this.services.set(key, {
      factory,
      singleton,
      instance: undefined
    });
  }

  registerSingleton<T>(key: ServiceKey, factory: ServiceFactory<T>): void {
    this.register(key, factory, true);
  }

  async resolve<T>(key: ServiceKey): Promise<T> {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not registered: ${String(key)}`);
    }

    if (service.singleton) {
      if (!service.instance) {
        service.instance = await service.factory();
      }
      return service.instance;
    }

    return await service.factory();
  }

  has(key: ServiceKey): boolean {
    return this.services.has(key);
  }

  clear(): void {
    this.services.clear();
  }
}

// Service Keys
export const ServiceKeys = {
  // Core Services
  CONFIG: Symbol('config'),
  HTTP_CLIENT: Symbol('httpClient'),
  STORAGE: Symbol('storage'),
  DIFF_ENGINE: Symbol('diffEngine'),
  REPORTER: Symbol('reporter'),
  SCHEMA_MANAGER: Symbol('schemaManager'),
  SNAPSHOT_SERVICE: Symbol('snapshotService'),
  
  // Registries
  AUTH_REGISTRY: Symbol('authRegistry'),
  COMMAND_REGISTRY: Symbol('commandRegistry'),
  FORMATTER_REGISTRY: Symbol('formatterRegistry'),
  STORAGE_REGISTRY: Symbol('storageRegistry'),
  DIFF_REGISTRY: Symbol('diffRegistry'),
  
  // Plugin Manager
  PLUGIN_MANAGER: Symbol('pluginManager')
} as const;

// Global container instance
export const container = new DIContainer();