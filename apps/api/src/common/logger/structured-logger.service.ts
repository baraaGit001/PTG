import type { LoggerService, LogLevel } from '@nestjs/common';

/**
 * Emits one JSON line per log entry (timestamp, level, context, message) so
 * log aggregators (CloudWatch, Loki, Datadog, ...) can parse structured
 * fields instead of scraping ad-hoc formatted text. Used in every
 * environment except local `pnpm dev`, where Nest's default pretty printer
 * is easier to read (see main.ts).
 */
export class StructuredLogger implements LoggerService {
  private write(level: LogLevel, message: unknown, context?: string, extra?: unknown): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? null,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...(extra !== undefined ? { detail: String(extra) } : {}),
    };
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(entry)}\n`);
  }

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }
}
