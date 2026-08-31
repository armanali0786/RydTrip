import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

const fail = () => Promise.reject(new Error('boom'));
const succeed = () => Promise.resolve('ok');

describe('CircuitBreaker', () => {
  it('starts CLOSED and passes calls through', async () => {
    const breaker = new CircuitBreaker('test');
    expect(breaker.getState()).toBe('CLOSED');
    await expect(breaker.execute(succeed)).resolves.toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('trips to OPEN after failureThreshold consecutive failures', async () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 3 });

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow('boom');
    }
    expect(breaker.getState()).toBe('OPEN');
  });

  it('fails fast with CircuitOpenError while OPEN, without invoking the wrapped fn', async () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 10_000 });
    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('OPEN');

    const spy = jest.fn(succeed);
    await expect(breaker.execute(spy)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('a success mid-CLOSED resets the consecutive failure count', async () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 2 });
    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    await expect(breaker.execute(succeed)).resolves.toBe('ok');
    // Failure count reset by the success above, so one more failure alone
    // shouldn't trip a threshold of 2.
    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('moves to HALF_OPEN after resetTimeoutMs and closes again on a successful trial call', async () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 50 });
    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('OPEN');

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(breaker.getState()).toBe('HALF_OPEN');

    await expect(breaker.execute(succeed)).resolves.toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('a failed HALF_OPEN trial call re-opens the circuit', async () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 50 });
    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(breaker.getState()).toBe('HALF_OPEN');

    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('OPEN');
  });
});
