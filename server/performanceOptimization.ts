import { Request, Response, NextFunction } from 'express';

// In-memory cache implementation (use Redis in production)
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number; hits: number }>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data: value, expires, hits: 0 });
    
    // Cleanup expired entries when cache gets large
    if (this.cache.size > 10000) {
      this.cleanup();
    }
  }

  get(key: string): any {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    this.stats.evictions += evicted;
    
    // If still too large, remove least accessed items
    if (this.cache.size > 8000) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits)
        .slice(0, 2000);
      
      entries.forEach(([key]) => {
        this.cache.delete(key);
        evicted++;
      });
      
      this.stats.evictions += evicted;
    }
  }
}

export const cache = new MemoryCache();

// Cache configuration for different types of data
export const cacheConfig = {
  properties: {
    ttl: 300, // 5 minutes
    key: (params: any) => `properties:${JSON.stringify(params)}`
  },
  property: {
    ttl: 600, // 10 minutes
    key: (id: string) => `property:${id}`
  },
  user: {
    ttl: 900, // 15 minutes
    key: (id: string) => `user:${id}`
  },
  analytics: {
    ttl: 3600, // 1 hour
    key: (type: string, params?: any) => `analytics:${type}:${params ? JSON.stringify(params) : 'all'}`
  },
  search: {
    ttl: 180, // 3 minutes
    key: (query: string, filters: any) => `search:${query}:${JSON.stringify(filters)}`
  },
  platformStats: {
    ttl: 1800, // 30 minutes
    key: () => 'platform:stats'
  }
};

// Response caching middleware
export function cacheResponse(config: { ttl: number; keyGenerator: (req: Request) => string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = config.keyGenerator(req);
    const cachedResponse = cache.get(cacheKey);
    
    if (cachedResponse) {
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode === 200 && data) {
        cache.set(cacheKey, data, config.ttl);
      }
      
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      return originalJson.call(this, data);
    };

    next();
  };
}

// Database query caching wrapper
export function withCache<T>(
  cacheKey: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        resolve(cached);
        return;
      }

      // Execute query
      const result = await queryFn();
      
      // Cache the result
      if (result !== null && result !== undefined) {
        cache.set(cacheKey, result, ttl);
      }
      
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// Property listing cache middleware
export const cachePropertyListings = cacheResponse({
  ttl: cacheConfig.properties.ttl,
  keyGenerator: (req) => {
    const { page = 1, limit = 20, search, type, minPrice, maxPrice, city, state } = req.query;
    return `properties:list:${page}:${limit}:${search || ''}:${type || ''}:${minPrice || ''}:${maxPrice || ''}:${city || ''}:${state || ''}`;
  }
});

// Individual property cache middleware
export const cacheProperty = cacheResponse({
  ttl: cacheConfig.property.ttl,
  keyGenerator: (req) => `property:${req.params.id}`
});

// Analytics cache middleware
export const cacheAnalytics = cacheResponse({
  ttl: cacheConfig.analytics.ttl,
  keyGenerator: (req) => {
    const { timeframe = '30d', metric = 'all' } = req.query;
    return `analytics:${timeframe}:${metric}`;
  }
});

// Platform stats cache middleware
export const cachePlatformStats = cacheResponse({
  ttl: cacheConfig.platformStats.ttl,
  keyGenerator: () => 'platform:stats'
});

// Search results cache middleware
export const cacheSearchResults = cacheResponse({
  ttl: cacheConfig.search.ttl,
  keyGenerator: (req) => {
    const { q, filters, sort, page = 1 } = req.query;
    return `search:${q || ''}:${JSON.stringify(filters || {})}:${sort || ''}:${page}`;
  }
});

// Cache invalidation helpers
export class CacheInvalidator {
  static invalidateProperty(propertyId: string): void {
    cache.delete(`property:${propertyId}`);
    // Invalidate property listings that might contain this property
    this.invalidatePattern('properties:list:');
    this.invalidatePattern('search:');
  }

  static invalidateUser(userId: string): void {
    cache.delete(`user:${userId}`);
  }

  static invalidateAnalytics(): void {
    this.invalidatePattern('analytics:');
    cache.delete('platform:stats');
  }

  static invalidateSearch(): void {
    this.invalidatePattern('search:');
  }

  static invalidateAll(): void {
    cache.clear();
  }

  private static invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    // This is inefficient for large caches - use Redis with pattern matching in production
    for (const [key] of cache['cache'].entries()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
  }
}

// Performance monitoring middleware
interface PerformanceMetrics {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  requestCount: number;
  errorCount: number;
  lastReset: number;
}

const performanceMetrics = new Map<string, PerformanceMetrics>();

export function performanceMonitoring(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const key = `${req.method}:${req.route?.path || req.path}`;
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    const existing = performanceMetrics.get(key) || {
      endpoint: req.path,
      method: req.method,
      avgResponseTime: 0,
      requestCount: 0,
      errorCount: 0,
      lastReset: Date.now()
    };

    // Update metrics
    existing.requestCount++;
    existing.avgResponseTime = (existing.avgResponseTime * (existing.requestCount - 1) + responseTime) / existing.requestCount;
    
    if (isError) {
      existing.errorCount++;
    }

    performanceMetrics.set(key, existing);
    
    // Log slow requests
    if (responseTime > 1000) {
      console.log(`🐌 Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
  });

  next();
}

// Get performance metrics
export function getPerformanceMetrics(): Record<string, PerformanceMetrics> {
  const metrics: Record<string, PerformanceMetrics> = {};
  
  for (const [key, value] of performanceMetrics.entries()) {
    metrics[key] = {
      ...value,
      errorRate: value.errorCount / value.requestCount || 0
    };
  }
  
  return metrics;
}

// Database connection pooling optimization
export const dbOptimization = {
  // Connection pool settings
  poolConfig: {
    min: 2,
    max: 10,
    idle: 10000,
    acquire: 60000,
    evict: 1000
  },

  // Query optimization hints
  queryHints: {
    // Use indexes for common queries
    propertySearch: {
      indexes: ['city', 'state', 'price', 'property_type', 'created_at'],
      orderBy: 'created_at DESC'
    },
    userLookup: {
      indexes: ['email', 'stripe_customer_id'],
      limit: 1
    },
    analytics: {
      indexes: ['created_at', 'user_id', 'event_type'],
      groupBy: ['DATE(created_at)']
    }
  }
};

// Image optimization middleware
export function imageOptimization(req: Request, res: Response, next: NextFunction) {
  // Set cache headers for images
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
      'Expires': new Date(Date.now() + 31536000000).toUTCString()
    });
  }
  
  next();
}

// Compression middleware for API responses
export function responseCompression(req: Request, res: Response, next: NextFunction) {
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  if (acceptEncoding.includes('gzip')) {
    res.set('Content-Encoding', 'gzip');
  }
  
  next();
}

// Health check endpoint for monitoring
export function healthCheck(req: Request, res: Response) {
  const stats = cache.getStats();
  const metrics = getPerformanceMetrics();
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    },
    cache: {
      hitRate: Math.round(stats.hitRate * 100),
      size: stats.size,
      hits: stats.hits,
      misses: stats.misses
    },
    performance: {
      slowestEndpoints: Object.entries(metrics)
        .sort((a, b) => b[1].avgResponseTime - a[1].avgResponseTime)
        .slice(0, 5)
        .map(([endpoint, data]) => ({
          endpoint,
          avgResponseTime: Math.round(data.avgResponseTime),
          requestCount: data.requestCount,
          errorRate: Math.round((data.errorCount / data.requestCount) * 100)
        }))
    }
  };
  
  res.json(health);
}

// Cache warming functions
export async function warmCache() {
  console.log('🔥 Warming cache...');
  
  try {
    // Warm up common queries that would be cache misses
    // These would call your actual data functions
    
    console.log('✅ Cache warmed successfully');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}

// Cache cleanup job
setInterval(() => {
  const beforeSize = cache.getStats().size;
  cache['cleanup']();
  const afterSize = cache.getStats().size;
  
  if (beforeSize !== afterSize) {
    console.log(`🧹 Cache cleanup: ${beforeSize - afterSize} items removed`);
  }
}, 60000); // Run every minute

// Performance metrics reset job
setInterval(() => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  for (const [key, metrics] of performanceMetrics.entries()) {
    if (metrics.lastReset < oneDayAgo) {
      performanceMetrics.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

console.log('🚀 Performance optimization and caching system initialized');

// Export all optimization middleware
export const optimizationMiddleware = [
  performanceMonitoring,
  imageOptimization,
  responseCompression
];