/**
 * Performance monitoring utilities for the BiletAra application
 * This file contains functions to monitor and optimize application performance
 */

import React from 'react';

// Client-side performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.recordMetric(name, duration);

    if (duration > 100) {
      console.warn(`⚠️ Slow function detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.recordMetric(name, duration);

    if (duration > 1000) {
      console.warn(`⚠️ Slow async function detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  // Record a metric
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  // Get performance statistics
  getStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  // Generate performance report
  generateReport(): string {
    let report = '📊 Performance Report\n';
    report += '='.repeat(50) + '\n\n';

    for (const [name, values] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        report += `${name}:\n`;
        report += `  Average: ${stats.avg.toFixed(2)}ms\n`;
        report += `  Min: ${stats.min.toFixed(2)}ms\n`;
        report += `  Max: ${stats.max.toFixed(2)}ms\n`;
        report += `  Count: ${stats.count}\n\n`;
      }
    }

    return report;
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear();
  }
}

// Component render performance tracker
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return function PerformanceTrackedComponent(props: P) {
    const monitor = PerformanceMonitor.getInstance();

    React.useEffect(() => {
      const renderStart = performance.now();

      return () => {
        const renderTime = performance.now() - renderStart;
        monitor.recordMetric(`${componentName}_render`, renderTime);
      };
    });

    return React.createElement(Component, props);
  };
}

// API response time monitoring
export async function monitorApiCall<T>(
  url: string,
  fetchFunction: () => Promise<T>
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  const start = performance.now();

  try {
    const result = await fetchFunction();
    const duration = performance.now() - start;

    monitor.recordMetric(`api_${url}`, duration);

    if (duration > 2000) {
      console.warn(`⚠️ Slow API call: ${url} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    monitor.recordMetric(`api_${url}_error`, duration);
    throw error;
  }
}

// Memory usage monitoring
export function monitorMemoryUsage(): void {
  if (typeof window === 'undefined' || !('memory' in performance)) return;

  const memory = (performance as any).memory;
  const memoryInfo = {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };

  console.log('Memory Usage:', {
    used: `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    total: `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    limit: `${(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
  });

  if (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit > 0.8) {
    console.warn('⚠️ High memory usage detected');
  }
}

// Bundle size analysis
export function analyzeBundleSize(): void {
  if (typeof window === 'undefined') return;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  console.log('📦 Bundle Analysis:');
  console.log(`Scripts: ${scripts.length}`);
  console.log(`Stylesheets: ${styles.length}`);

  // Monitor for large resources
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.transferSize && resourceEntry.transferSize > 500000) { // > 500KB
          console.warn(`⚠️ Large resource: ${entry.name} (${(resourceEntry.transferSize / 1024).toFixed(2)} KB)`);
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();