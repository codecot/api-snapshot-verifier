import { Registry } from './interfaces.js';

export class GenericRegistry<T> implements Registry<T> {
  private items = new Map<string, T>();

  register(name: string, item: T): void {
    this.items.set(name, item);
  }

  get(name: string): T | undefined {
    return this.items.get(name);
  }

  getAll(): Record<string, T> {
    const result: Record<string, T> = {};
    for (const [name, item] of this.items) {
      result[name] = item;
    }
    return result;
  }

  has(name: string): boolean {
    return this.items.has(name);
  }

  remove(name: string): boolean {
    return this.items.delete(name);
  }

  clear(): void {
    this.items.clear();
  }

  list(): string[] {
    return Array.from(this.items.keys());
  }
}