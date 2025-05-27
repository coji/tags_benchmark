export interface BenchmarkResult {
  avg: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
  count: number;
  total: number; // 追加
}

export class Timer {
  private times: number[] = [];

  start(): () => void {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      this.times.push(endTime - startTime);
    };
  }

  async measure<T>(fn: () => Promise<T>): Promise<T> {
    const stop = this.start();
    const result = await fn();
    stop();
    return result;
  }

  getResult(): BenchmarkResult {
    if (this.times.length === 0) {
      return { avg: 0, p50: 0, p95: 0, min: 0, max: 0, count: 0, total: 0 };
    }

    const sorted = [...this.times].sort((a, b) => a - b);
    const total = this.times.reduce((sum, time) => sum + time, 0);
    const avg = total / this.times.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return {
      avg,
      p50,
      p95,
      min,
      max,
      count: this.times.length,
      total,
    };
  }

  reset() {
    this.times = [];
  }

  static formatMs(ms: number): string {
    return `${ms.toFixed(1)}ms`;
  }

  static formatSeconds(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  getTotal(): number {
    return this.times.reduce((sum, time) => sum + time, 0);
  }
}
