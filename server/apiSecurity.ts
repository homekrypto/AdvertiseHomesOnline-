import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Role-based rate limits
export const rateLimits: Record<string, RateLimitConfig> = {
  free: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Upgrade to Premium for higher limits.'
  },
  registered: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 500,
    message: 'Rate limit exceeded. Please wait before making more requests.'
  },
  premium: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000,
    message: 'Rate limit exceeded. Please wait before making more requests.'
  },
  agent: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 2000,
    message: 'Rate limit exceeded. Please wait before making more requests.'
  },
  agency: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5000,
    message: 'Rate limit exceeded. Please wait before making more requests.'
  },
  expert: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10000,
    message: 'Rate limit exceeded. Please wait before making more requests.'
  },
  admin: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20000,
    message: 'Rate limit exceeded. Please wait before making more requests.'
  }
};

// Endpoint-specific rate limits
export const endpointLimits: Record<string, RateLimitConfig> = {
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many login attempts. Please try again later.'
  },
  '/api/contact': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many contact form submissions. Please wait before submitting again.'
  },
  '/api/properties/search': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Search rate limit exceeded. Please slow down your requests.'
  },
  '/api/leads': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 100,
    message: 'Lead creation limit exceeded. Please wait before creating more leads.'
  }
};

// Rate limiting middleware
export function createRateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const store = rateLimitStore.get(key);

    // Clean expired entries
    if (store && now > store.resetTime) {
      rateLimitStore.delete(key);
    }

    const current = rateLimitStore.get(key) || { count: 0, resetTime: now + config.windowMs };

    if (current.count >= config.maxRequests) {
      const timeRemaining = Math.ceil((current.resetTime - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
        'Retry-After': timeRemaining.toString()
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: config.message,
        retryAfter: timeRemaining
      });
    }

    // Update rate limit counter
    current.count++;
    rateLimitStore.set(key, current);

    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': (config.maxRequests - current.count).toString(),
      'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
    });

    next();
  };
}

// Role-based rate limiting middleware
export function roleBasedRateLimit(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const userRole = user?.claims?.role || 'free';
  
  const config = rateLimits[userRole] || rateLimits.free;
  const key = `${userRole}:${user?.claims?.sub || req.ip}`;
  const now = Date.now();
  const store = rateLimitStore.get(key);

  if (store && now > store.resetTime) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + config.windowMs };

  if (current.count >= config.maxRequests) {
    const timeRemaining = Math.ceil((current.resetTime - now) / 1000);
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: config.message,
      retryAfter: timeRemaining,
      currentPlan: userRole,
      upgradeUrl: '/subscribe'
    });
  }

  current.count++;
  rateLimitStore.set(key, current);

  res.set({
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': (config.maxRequests - current.count).toString(),
    'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
  });

  next();
}

// Request validation schemas
export const validationSchemas = {
  createProperty: z.object({
    title: z.string().min(5).max(200),
    description: z.string().max(5000).optional(),
    price: z.number().positive().max(50000000),
    address: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(50),
    zipCode: z.string().max(10).optional(),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().min(0).max(20),
    sqft: z.number().int().positive().max(100000).optional(),
    propertyType: z.enum(['house', 'apartment', 'condo', 'townhouse', 'land', 'commercial'])
  }),

  createLead: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    message: z.string().max(2000).optional(),
    propertyId: z.string().uuid().optional()
  }),

  contactForm: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    subject: z.string().min(5).max(200),
    message: z.string().min(10).max(2000)
  }),

  userUpdate: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().max(20).optional(),
    preferences: z.object({}).optional()
  })
};

// Request validation middleware
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = schema.safeParse(req.body);
      
      if (!validation.success) {
        const errors = validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      // Replace req.body with validated data
      req.body = validation.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potential XSS patterns
      return value
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    
    return value;
  }

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; frame-ancestors 'none';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });

  next();
}

// IP-based blocking (basic implementation)
const blockedIPs = new Set<string>();
const suspiciousActivity = new Map<string, { count: number; lastActivity: number }>();

export function ipSecurityCheck(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip;
  
  // Check if IP is blocked
  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity'
    });
  }

  // Track suspicious activity
  const now = Date.now();
  const activity = suspiciousActivity.get(clientIP) || { count: 0, lastActivity: now };
  
  // Reset count if more than 1 hour has passed
  if (now - activity.lastActivity > 60 * 60 * 1000) {
    activity.count = 0;
  }

  activity.count++;
  activity.lastActivity = now;
  suspiciousActivity.set(clientIP, activity);

  // Block IP if too many requests in short time
  if (activity.count > 1000) {
    blockedIPs.add(clientIP);
    console.log(`🚫 Blocked IP ${clientIP} due to excessive requests`);
    
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity'
    });
  }

  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const user = (req as any).user;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: user?.claims?.sub || 'anonymous',
      userRole: user?.claims?.role || 'free'
    };

    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.log(`🔍 ${res.statusCode} ${req.method} ${req.url} - ${req.ip} - ${duration}ms`);
    }

    // Store in audit log (implement proper logging in production)
    if (res.statusCode >= 500) {
      console.error('🚨 Server Error:', logData);
    }
  });

  next();
}

// CORS configuration
export function corsHandler(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://your-domain.com'
  ];

  const origin = req.get('Origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }

  res.set({
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  });

  if (req.method === 'OPTIONS') {
    res.status(204).send();
  } else {
    next();
  }
}

// Combined security middleware stack
export function applySecurity() {
  return [
    corsHandler,
    securityHeaders,
    ipSecurityCheck,
    sanitizeInput,
    requestLogger,
    roleBasedRateLimit
  ];
}

// Endpoint-specific security
export function endpointSecurity(endpoint: string) {
  const config = endpointLimits[endpoint];
  const middlewares = [corsHandler, securityHeaders, sanitizeInput, requestLogger];
  
  if (config) {
    middlewares.push(createRateLimit(config));
  } else {
    middlewares.push(roleBasedRateLimit);
  }

  return middlewares;
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Clean up suspicious activity tracking
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [ip, activity] of suspiciousActivity.entries()) {
    if (now - activity.lastActivity > oneHour) {
      suspiciousActivity.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

console.log('🔒 API Security & Rate Limiting initialized');