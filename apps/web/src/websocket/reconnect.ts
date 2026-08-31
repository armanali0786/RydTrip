export interface ReconnectConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitterRatio: number;
  maxRetries?: number;
}

const DEFAULT_CONFIG: ReconnectConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  factor: 2,
  jitterRatio: 0.2,
};

export class ReconnectStrategy {
  private attempts = 0;
  private config: ReconnectConfig;

  constructor(config: Partial<ReconnectConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public getNextDelay(): number {
    this.attempts++;
    const { initialDelayMs, maxDelayMs, factor, jitterRatio } = this.config;
    
    // Exponential backoff
    const rawDelay = Math.min(
      initialDelayMs * Math.pow(factor, this.attempts - 1),
      maxDelayMs
    );

    // Apply jitter to avoid thundering herd problem
    const jitter = rawDelay * jitterRatio * (Math.random() * 2 - 1);
    return Math.max(0, Math.floor(rawDelay + jitter));
  }

  public reset(): void {
    this.attempts = 0;
  }

  public getAttemptCount(): number {
    return this.attempts;
  }
}
