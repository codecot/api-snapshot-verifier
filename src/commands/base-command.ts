import { Command, CommandOption, CommandContext } from '../core/interfaces.js';

export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  abstract options: CommandOption[];

  abstract execute(options: any, context: CommandContext): Promise<void>;

  protected validateRequiredOptions(options: any, required: string[]): void {
    const missing = required.filter(key => !options[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required options: ${missing.join(', ')}`);
    }
  }

  protected async resolveService<T>(context: CommandContext, serviceKey: symbol): Promise<T> {
    return await context.container.resolve<T>(serviceKey);
  }
}