export class Logger {
  private logLevel: string;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.error(`[INFO] ${new Date().toISOString()} - ${message}`);
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.error(`[WARN] ${new Date().toISOString()} - ${message}`);
    }
  }

  error(message: string): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    }
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.error(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevel = levels.indexOf(this.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel <= currentLevel;
  }
}
