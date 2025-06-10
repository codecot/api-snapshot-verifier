import chalk from 'chalk';
import { Logger } from './interfaces.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

export class ConsoleLogger implements Logger {
  constructor(private config: LoggerConfig = { level: LogLevel.INFO }) {}

  debug(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.log('DEBUG', chalk.gray, message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.INFO) {
      this.log('INFO', chalk.blue, message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.WARN) {
      this.log('WARN', chalk.yellow, message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      this.log('ERROR', chalk.red, message, ...args);
    }
  }

  private log(level: string, colorFn: (str: string) => string, message: string, ...args: any[]): void {
    const parts: string[] = [];

    if (this.config.timestamp) {
      parts.push(chalk.gray(new Date().toISOString()));
    }

    if (this.config.prefix) {
      parts.push(chalk.cyan(`[${this.config.prefix}]`));
    }

    parts.push(colorFn(`[${level}]`));
    parts.push(message);

    console.log(parts.join(' '), ...args);
  }
}

// Silent logger for testing
export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}