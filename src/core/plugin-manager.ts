import { Plugin, PluginContext, PluginType, Logger } from './interfaces.js';
import { Container } from './container.js';
import { Config } from '../types.js';

export interface PluginManager {
  loadPlugin(plugin: Plugin): Promise<void>;
  unloadPlugin(name: string): Promise<void>;
  getPlugin(name: string): Plugin | undefined;
  getPluginsByType(type: PluginType): Plugin[];
  getAllPlugins(): Plugin[];
  hasPlugin(name: string): boolean;
}

export class DefaultPluginManager implements PluginManager {
  private plugins = new Map<string, Plugin>();
  private pluginsByType = new Map<PluginType, Set<string>>();

  constructor(
    private container: Container,
    private config: Config,
    private logger: Logger
  ) {}

  async loadPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already loaded`);
    }

    this.logger.info(`Loading plugin: ${plugin.name} v${plugin.version} (${plugin.type})`);

    const context: PluginContext = {
      container: this.container,
      config: this.config,
      logger: this.logger
    };

    try {
      await plugin.initialize(context);
      
      this.plugins.set(plugin.name, plugin);
      
      if (!this.pluginsByType.has(plugin.type)) {
        this.pluginsByType.set(plugin.type, new Set());
      }
      this.pluginsByType.get(plugin.type)!.add(plugin.name);

      this.logger.info(`Successfully loaded plugin: ${plugin.name}`);
    } catch (error) {
      this.logger.error(`Failed to load plugin '${plugin.name}':`, error);
      throw error;
    }
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not loaded`);
    }

    this.logger.info(`Unloading plugin: ${name}`);

    try {
      if (plugin.shutdown) {
        await plugin.shutdown();
      }

      this.plugins.delete(name);
      
      const typeSet = this.pluginsByType.get(plugin.type);
      if (typeSet) {
        typeSet.delete(name);
        if (typeSet.size === 0) {
          this.pluginsByType.delete(plugin.type);
        }
      }

      this.logger.info(`Successfully unloaded plugin: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to unload plugin '${name}':`, error);
      throw error;
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getPluginsByType(type: PluginType): Plugin[] {
    const names = this.pluginsByType.get(type);
    if (!names) return [];

    return Array.from(names)
      .map(name => this.plugins.get(name))
      .filter(plugin => plugin !== undefined) as Plugin[];
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down plugin manager...');
    
    const shutdownPromises = Array.from(this.plugins.values()).map(async plugin => {
      if (plugin.shutdown) {
        try {
          await plugin.shutdown();
        } catch (error) {
          this.logger.error(`Error shutting down plugin '${plugin.name}':`, error);
        }
      }
    });

    await Promise.all(shutdownPromises);
    
    this.plugins.clear();
    this.pluginsByType.clear();
    
    this.logger.info('Plugin manager shutdown complete');
  }
}