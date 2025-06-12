import { 
  Container, 
  ServiceKeys, 
  container as defaultContainer 
} from './container.js';
import { 
  Command, 
  CommandContext, 
  Logger, 
  HttpClient, 
  StorageProvider, 
  DiffProvider, 
  OutputFormatter, 
  AuthProvider,
  SnapshotService
} from './interfaces.js';
import { GenericRegistry } from './registry.js';
import { DefaultPluginManager } from './plugin-manager.js';
import { ConsoleLogger, LogLevel } from './logger.js';
import { Config } from '../types.js';

// Core service implementations
import { AxiosHttpClient } from '../services/http-client.js';
import { FileSystemStorageProvider } from '../services/storage-provider.js';
import { JsonDiffProvider } from '../services/diff-provider.js';
import { DefaultSnapshotService } from '../services/snapshot-service.js';

// Built-in formatters
import { TableFormatter } from '../plugins/formatters/table-formatter.js';
import { JsonFormatter } from '../plugins/formatters/json-formatter.js';
import { MarkdownFormatter } from '../plugins/formatters/markdown-formatter.js';

// Built-in auth providers
import { BearerAuthProvider } from '../plugins/auth/bearer-auth-provider.js';
import { ApiKeyAuthProvider } from '../plugins/auth/api-key-auth-provider.js';
import { BasicAuthProvider } from '../plugins/auth/basic-auth-provider.js';

// Built-in commands
import { InitCommand } from '../commands/init-command.js';
import { CaptureCommand } from '../commands/capture-command.js';
import { CompareCommand } from '../commands/compare-command.js';

import { SchemaManager } from '../schema-manager.js';

export interface ApplicationConfig {
  config: Config;
  logLevel?: LogLevel;
  container?: Container;
}

export class Application {
  private container: Container;
  private logger: Logger;
  private pluginManager!: DefaultPluginManager;
  private commandRegistry!: GenericRegistry<Command>;
  private initialized = false;

  constructor(private appConfig: ApplicationConfig) {
    this.container = appConfig.container || defaultContainer;
    this.logger = new ConsoleLogger({ 
      level: appConfig.logLevel || LogLevel.INFO,
      prefix: 'api-snapshot'
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing application...');

    // Register core services
    await this.registerCoreServices();

    // Register built-in plugins
    await this.registerBuiltInPlugins();

    // Initialize plugin manager
    this.pluginManager = new DefaultPluginManager(
      this.container,
      this.appConfig.config,
      this.logger
    );

    this.container.registerSingleton(ServiceKeys.PLUGIN_MANAGER, () => this.pluginManager);

    this.initialized = true;
    this.logger.info('Application initialized successfully');
  }

  async registerCommand(command: Command): Promise<void> {
    if (!this.commandRegistry) {
      this.commandRegistry = await this.container.resolve<GenericRegistry<Command>>(ServiceKeys.COMMAND_REGISTRY);
    }
    
    this.commandRegistry.register(command.name, command);
    this.logger.debug(`Registered command: ${command.name}`);
  }

  async executeCommand(commandName: string, options: any): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const commandRegistry = await this.container.resolve<GenericRegistry<Command>>(ServiceKeys.COMMAND_REGISTRY);
    const command = commandRegistry.get(commandName);

    if (!command) {
      throw new Error(`Command '${commandName}' not found. Available commands: ${commandRegistry.list().join(', ')}`);
    }

    const context: CommandContext = {
      container: this.container,
      config: this.appConfig.config,
      logger: this.logger
    };

    this.logger.debug(`Executing command: ${commandName}`);
    await command.execute(options, context);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down application...');
    
    if (this.pluginManager) {
      await this.pluginManager.shutdown();
    }

    this.container.clear();
    this.initialized = false;
    
    this.logger.info('Application shutdown complete');
  }

  getContainer(): Container {
    return this.container;
  }

  getConfig(): Config {
    return this.appConfig.config;
  }

  getLogger(): Logger {
    return this.logger;
  }

  private async registerCoreServices(): Promise<void> {
    this.logger.debug('Registering core services...');

    // Register logger
    this.container.registerSingleton(ServiceKeys.CONFIG, () => this.appConfig.config);

    // Register core services
    this.container.registerSingleton(ServiceKeys.HTTP_CLIENT, () => new AxiosHttpClient());
    
    this.container.registerSingleton(ServiceKeys.STORAGE, () => 
      new FileSystemStorageProvider(
        this.appConfig.config.snapshotDir,
        this.appConfig.config.baselineDir
      )
    );

    this.container.registerSingleton(ServiceKeys.DIFF_ENGINE, () => new JsonDiffProvider());
    this.container.registerSingleton(ServiceKeys.SCHEMA_MANAGER, () => new SchemaManager());

    // Register snapshot service
    this.container.registerSingleton(ServiceKeys.SNAPSHOT_SERVICE, async () => {
      const httpClient = await this.container.resolve<HttpClient>(ServiceKeys.HTTP_CLIENT);
      const storageProvider = await this.container.resolve<StorageProvider>(ServiceKeys.STORAGE);
      const authRegistry = await this.container.resolve<GenericRegistry<AuthProvider>>(ServiceKeys.AUTH_REGISTRY);
      const schemaManager = await this.container.resolve<SchemaManager>(ServiceKeys.SCHEMA_MANAGER);
      
      return new DefaultSnapshotService(
        httpClient,
        storageProvider,
        authRegistry,
        schemaManager,
        this.appConfig.config.endpoints,
        this.logger
      );
    });

    // Register registries
    this.container.registerSingleton(ServiceKeys.AUTH_REGISTRY, () => new GenericRegistry<AuthProvider>());
    this.container.registerSingleton(ServiceKeys.COMMAND_REGISTRY, () => new GenericRegistry<Command>());
    this.container.registerSingleton(ServiceKeys.FORMATTER_REGISTRY, () => new GenericRegistry<OutputFormatter>());
    this.container.registerSingleton(ServiceKeys.STORAGE_REGISTRY, () => new GenericRegistry<StorageProvider>());
    this.container.registerSingleton(ServiceKeys.DIFF_REGISTRY, () => new GenericRegistry<DiffProvider>());
  }

  private async registerBuiltInPlugins(): Promise<void> {
    this.logger.debug('Registering built-in plugins...');

    // Register auth providers
    const authRegistry = await this.container.resolve<GenericRegistry<AuthProvider>>(ServiceKeys.AUTH_REGISTRY);
    authRegistry.register('bearer', new BearerAuthProvider());
    authRegistry.register('apikey', new ApiKeyAuthProvider());
    authRegistry.register('basic', new BasicAuthProvider());

    // Register formatters
    const formatterRegistry = await this.container.resolve<GenericRegistry<OutputFormatter>>(ServiceKeys.FORMATTER_REGISTRY);
    formatterRegistry.register('table', new TableFormatter());
    formatterRegistry.register('json', new JsonFormatter());
    formatterRegistry.register('markdown', new MarkdownFormatter());

    // Register diff providers
    const diffRegistry = await this.container.resolve<GenericRegistry<DiffProvider>>(ServiceKeys.DIFF_REGISTRY);
    diffRegistry.register('json', new JsonDiffProvider());

    // Register storage providers
    const storageRegistry = await this.container.resolve<GenericRegistry<StorageProvider>>(ServiceKeys.STORAGE_REGISTRY);
    storageRegistry.register('filesystem', new FileSystemStorageProvider(
      this.appConfig.config.snapshotDir,
      this.appConfig.config.baselineDir
    ));

    // Register commands
    await this.registerCommand(new InitCommand());
    await this.registerCommand(new CaptureCommand());
    await this.registerCommand(new CompareCommand());
  }
}