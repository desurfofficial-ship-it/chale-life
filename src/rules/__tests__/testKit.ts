/**
 * Micro test kit — a ~100-line describe/it/expect harness with ZERO
 * dependencies, because package.json is owned by the Engine agent and
 * must not gain a test runner from this PR.
 *
 * Tests register synchronously at import time and run via runAll()
 * (see run.ts). Assert failures throw; `it` captures them. CI keeps
 * passing because `tsc --noEmit` typechecks these files and the vite
 * build never imports them; local runs execute via the rolldown bundle.
 */

export interface TestCase {
  readonly suite: string;
  readonly name: string;
}

export interface TestResult extends TestCase {
  readonly ok: boolean;
  readonly error?: string;
}

const registered: Array<TestCase & { fn: () => void }> = [];
let currentSuite = '';

export function describe(suite: string, register: () => void): void {
  const outer = currentSuite;
  currentSuite = suite;
  register();
  currentSuite = outer;
}

export function it(name: string, fn: () => void): void {
  registered.push({ suite: currentSuite, name, fn });
}

function fmt(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export interface Expectation<T> {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toContain(expected: unknown): void;
  toThrow(expected?: string): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
}

export function expect<T>(actual: T): Expectation<T> {
  const fail = (msg: string): never => {
    throw new Error(msg);
  };
  const deepEqual = (a: unknown, b: unknown): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

  const expectation = {
    toBe(expected: T): void {
      if (actual !== expected) {
        fail(`expected ${fmt(expected)}, got ${fmt(actual)}`);
      }
    },
    toEqual(expected: unknown): void {
      if (!deepEqual(actual, expected)) {
        fail(`expected ${fmt(expected)}, got ${fmt(actual)}`);
      }
    },
    toBeCloseTo(expected: number, precision = 5): void {
      const delta = Math.abs((actual as unknown as number) - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      if (delta > tolerance) {
        fail(`expected ~${fmt(expected)} (±${tolerance}), got ${fmt(actual)}`);
      }
    },
    toBeTruthy(): void {
      if (!actual) fail(`expected truthy, got ${fmt(actual)}`);
    },
    toBeFalsy(): void {
      if (actual) fail(`expected falsy, got ${fmt(actual)}`);
    },
    toBeNull(): void {
      if (actual !== null) fail(`expected null, got ${fmt(actual)}`);
    },
    toBeDefined(): void {
      if (actual === undefined) fail(`expected defined, got undefined`);
    },
    toBeUndefined(): void {
      if (actual !== undefined) fail(`expected undefined, got ${fmt(actual)}`);
    },
    toContain(expected: unknown): void {
      const container = actual as unknown;
      if (typeof container === 'string') {
        if (!container.includes(expected as string)) {
          fail(`expected string to contain ${fmt(expected)}, got ${fmt(actual)}`);
        }
        return;
      }
      if (Array.isArray(container)) {
        if (!container.includes(expected)) {
          fail(`expected array to contain ${fmt(expected)}, got ${fmt(actual)}`);
        }
        return;
      }
      fail(`toContain expects a string or array, got ${fmt(actual)}`);
    },
    toThrow(expected?: string): void {
      const fn = actual as unknown as () => void;
      if (typeof fn !== 'function') fail(`toThrow expects a function`);
      try {
        fn();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (expected && !message.includes(expected)) {
          fail(`expected error containing ${fmt(expected)}, got ${fmt(message)}`);
        }
        return;
      }
      fail('expected function to throw, but it did not');
    },
    toBeGreaterThan(expected: number): void {
      if (!((actual as unknown as number) > expected)) {
        fail(`expected > ${fmt(expected)}, got ${fmt(actual)}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number): void {
      if (!((actual as unknown as number) >= expected)) {
        fail(`expected >= ${fmt(expected)}, got ${fmt(actual)}`);
      }
    },
    toBeLessThan(expected: number): void {
      if (!((actual as unknown as number) < expected)) {
        fail(`expected < ${fmt(expected)}, got ${fmt(actual)}`);
      }
    },
    toBeLessThanOrEqual(expected: number): void {
      if (!((actual as unknown as number) <= expected)) {
        fail(`expected <= ${fmt(expected)}, got ${fmt(actual)}`);
      }
    },
  };
  return expectation as Expectation<T>;
}

/** Run every registered test; returns one result per test. */
export function runAll(): TestResult[] {
  const results: TestResult[] = [];
  for (const test of registered) {
    try {
      test.fn();
      results.push({ suite: test.suite, name: test.name, ok: true });
    } catch (e) {
      results.push({
        suite: test.suite,
        name: test.name,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}
