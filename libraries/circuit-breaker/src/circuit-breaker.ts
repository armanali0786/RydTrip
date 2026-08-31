export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Consecutive failures required to trip from CLOSED to OPEN. Default 5. */
  failureThreshold?: number;
  /** How long the circuit stays OPEN (failing fast) before allowing one trial call. Default 10s. */
  resetTimeoutMs?: number;
}

/** Thrown in place of calling the wrapped function while the circuit is OPEN. */
export class CircuitOpenError extends Error {
  constructor(circuitName: string) {
    super(`circuit "${circuitName}" is open`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * A small CLOSED/OPEN/HALF_OPEN state machine (Phase 8), used to stop calling
 * a struggling dependency instead of letting every request hang on its own
 * timeout/retry. Deliberately a plain in-house class — same reasoning as
 * DriverReservationStore's atomic SET NX over a Lua script: the primitive is
 * simple enough that a dependency isn't worth it.
 *
 * CLOSED: calls pass through; consecutiveFailures resets on any success.
 * OPEN: calls are rejected immediately with CircuitOpenError until
 *   resetTimeoutMs has elapsed since the trip.
 * HALF_OPEN: exactly one trial call is let through; success closes the
 *   circuit, failure re-opens it (and restarts the reset timer).
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10_000;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() - this.openedAt >= this.resetTimeoutMs) {
      return 'HALF_OPEN';
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      throw new CircuitOpenError(this.name);
    }
    if (currentState === 'HALF_OPEN') {
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}
