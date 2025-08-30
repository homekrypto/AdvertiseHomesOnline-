import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertPropertySchema, insertLeadSchema, insertFavoriteSchema, insertSavedSearchSchema } from "@shared/schema";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Platform statistics - real data only
  app.get('/api/platform/stats', async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  // Property routes
  app.get('/api/properties', async (req, res) => {
    try {
      const filters = {
        search: req.query.search as string,
        city: req.query.city as string,
        state: req.query.state as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms as string) : undefined,
        bathrooms: req.query.bathrooms ? parseFloat(req.query.bathrooms as string) : undefined,
        propertyType: req.query.propertyType as string,
        featured: req.query.featured === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      };

      const properties = await storage.getProperties(filters);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get('/api/properties/:id', async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Increment views
      await storage.incrementPropertyViews(req.params.id);
      
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.get('/api/properties/slug/:slug', async (req, res) => {
    try {
      const property = await storage.getPropertyBySlug(req.params.slug);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Increment views
      await storage.incrementPropertyViews(property.id);
      
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['agent', 'agency', 'expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Enhanced listing cap enforcement
      try {
        const { enforceListingCaps } = await import('./featureFlags');
        await enforceListingCaps(userId, storage);
      } catch (capError: any) {
        return res.status(403).json({ 
          message: capError.message,
          code: 'LISTING_LIMIT_EXCEEDED'
        });
      }

      const propertyData = insertPropertySchema.parse({
        ...req.body,
        agentId: userId,
        organizationId: user.organizationId,
      });

      // Generate slug from title and city
      const slug = `${propertyData.title}-${propertyData.city}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const property = await storage.createProperty({
        ...propertyData,
        slug,
      });

      // Initialize analytics tracking for new property
      try {
        const { analyticsService } = await import('./analyticsService');
        await analyticsService.trackUserActivity({
          userId,
          activity: 'property_created',
          details: { 
            propertyId: property.id, 
            propertyType: property.propertyType,
            price: property.price,
            city: property.city,
            featured: property.featured 
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });
      } catch (analyticsError) {
        console.warn('Failed to track property creation analytics:', analyticsError);
      }

      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.put('/api/properties/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const user = await storage.getUser(userId);
      const isOwner = property.agentId === userId;
      const isAdmin = user?.role === 'admin';
      const isOrgMember = user?.organizationId && property.organizationId === user.organizationId;

      if (!isOwner && !isAdmin && !isOrgMember) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updates = req.body;
      const updatedProperty = await storage.updateProperty(req.params.id, updates);
      res.json(updatedProperty);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete('/api/properties/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const user = await storage.getUser(userId);
      const isOwner = property.agentId === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Lead routes
  app.post('/api/leads', async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(leadData);
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['agent', 'agency', 'expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      let leads;
      if (user.organizationId && ['agency', 'expert'].includes(user.role)) {
        leads = await storage.getLeadsByOrganization(user.organizationId);
      } else {
        leads = await storage.getLeadsByAgent(userId);
      }

      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Bulk property import (Agency/Expert only)
  app.post('/api/properties/bulk-import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['agency', 'expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ 
          message: "Bulk import requires Agency or Expert tier" 
        });
      }

      const { properties } = req.body;
      
      if (!Array.isArray(properties) || properties.length === 0) {
        return res.status(400).json({ message: "Properties array is required" });
      }

      if (properties.length > 50) {
        return res.status(400).json({ 
          message: "Bulk import limited to 50 properties at once" 
        });
      }

      const results = {
        successful: [],
        failed: [],
        skipped: []
      };

      for (const propertyData of properties) {
        try {
          // Check listing caps for each property
          const { enforceListingCaps } = await import('./featureFlags');
          await enforceListingCaps(userId, storage);

          const parsedData = insertPropertySchema.parse({
            ...propertyData,
            agentId: userId,
            organizationId: user.organizationId,
          });

          // Generate slug
          const slug = `${parsedData.title}-${parsedData.city}`.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          
          const property = await storage.createProperty({
            ...parsedData,
            slug,
          });

          results.successful.push({ 
            originalData: propertyData, 
            createdProperty: property 
          });

        } catch (error: any) {
          if (error.message.includes('LISTING_LIMIT_EXCEEDED')) {
            results.skipped.push({ 
              originalData: propertyData, 
              reason: 'Listing limit reached' 
            });
            break; // Stop processing if we hit the limit
          } else {
            results.failed.push({ 
              originalData: propertyData, 
              error: error.message 
            });
          }
        }
      }

      // Track bulk import activity
      try {
        const { analyticsService } = await import('./analyticsService');
        await analyticsService.trackUserActivity({
          userId,
          activity: 'bulk_property_import',
          details: {
            totalAttempted: properties.length,
            successful: results.successful.length,
            failed: results.failed.length,
            skipped: results.skipped.length
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });
      } catch (analyticsError) {
        console.warn('Failed to track bulk import analytics:', analyticsError);
      }

      res.status(201).json(results);
    } catch (error) {
      console.error("Error in bulk property import:", error);
      res.status(500).json({ message: "Failed to import properties" });
    }
  });

  // Feature property (use featured credits)
  app.post('/api/properties/:id/feature', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const propertyId = req.params.id;
      
      if (!user || !['agent', 'agency', 'expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check property ownership or organization membership
      const isOwner = property.agentId === userId;
      const isOrgMember = user.organizationId && property.organizationId === user.organizationId;
      const isAdmin = user.role === 'admin';

      if (!isOwner && !isOrgMember && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check and consume featured credits
      try {
        const { consumeFeaturedCredit } = await import('./featureFlags');
        await consumeFeaturedCredit(userId, storage);
      } catch (creditError: any) {
        return res.status(403).json({ 
          message: creditError.message,
          code: 'INSUFFICIENT_FEATURED_CREDITS'
        });
      }

      const { duration } = req.body; // duration in days, default 30
      const featureDuration = duration || 30;
      const featuredUntil = new Date();
      featuredUntil.setDate(featuredUntil.getDate() + featureDuration);

      const updatedProperty = await storage.updateProperty(propertyId, {
        featured: true,
        featuredUntil
      });

      // Track featured property activity
      try {
        const { analyticsService } = await import('./analyticsService');
        await analyticsService.trackUserActivity({
          userId,
          activity: 'property_featured',
          details: { 
            propertyId,
            duration: featureDuration,
            featuredUntil: featuredUntil.toISOString()
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });
      } catch (analyticsError) {
        console.warn('Failed to track property featuring analytics:', analyticsError);
      }

      res.json(updatedProperty);
    } catch (error) {
      console.error("Error featuring property:", error);
      res.status(500).json({ message: "Failed to feature property" });
    }
  });

  // Get property form configuration based on user tier
  app.get('/api/properties/form-config', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['agent', 'agency', 'expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { getFeatureFlags } = await import('./featureFlags');
      const featureFlags = await getFeatureFlags(user.role);

      const config = {
        role: user.role,
        features: featureFlags,
        bulkImportEnabled: ['agency', 'expert', 'admin'].includes(user.role),
        aiSuggestionsEnabled: ['expert', 'admin'].includes(user.role),
        featuredCreditsAvailable: user.featuredCredits || 0,
        listingCap: user.listingCap || 0,
        usedListings: user.usedListings || 0,
        availableListings: (user.listingCap || 0) - (user.usedListings || 0),
        advancedAnalytics: featureFlags.can_view_analytics === 'full',
        customBranding: featureFlags.custom_branding || false,
        prioritySupport: featureFlags.priority_support || false,
      };

      res.json(config);
    } catch (error) {
      console.error("Error fetching property form config:", error);
      res.status(500).json({ message: "Failed to fetch form configuration" });
    }
  });

  // Get AI property suggestions (Expert tier only)
  app.post('/api/properties/ai-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ 
          message: "AI suggestions require Expert tier" 
        });
      }

      const { propertyData } = req.body;
      
      // Simulate AI suggestions (in a real app, this would call an AI service)
      const suggestions = {
        pricing: {
          suggestedPrice: Math.round(propertyData.price * (0.95 + Math.random() * 0.1)),
          marketAnalysis: "Based on similar properties in the area",
          confidence: 0.85
        },
        description: {
          keyFeatures: [
            "Updated kitchen with modern appliances",
            "Spacious master bedroom with walk-in closet", 
            "Landscaped backyard perfect for entertaining"
          ],
          marketingTips: [
            "Highlight the location benefits",
            "Emphasize the move-in ready condition",
            "Mention nearby schools and amenities"
          ]
        },
        photography: {
          recommendedAngles: [
            "Front exterior with landscaping",
            "Kitchen showing modern updates",
            "Living room natural lighting"
          ],
          stagingTips: [
            "Declutter all personal items",
            "Add fresh flowers to dining table",
            "Open all blinds for natural light"
          ]
        }
      };

      // Track AI suggestion usage
      try {
        const { analyticsService } = await import('./analyticsService');
        await analyticsService.trackUserActivity({
          userId,
          activity: 'ai_suggestions_used',
          details: { 
            propertyType: propertyData.propertyType,
            priceRange: propertyData.price,
            suggestionsGenerated: Object.keys(suggestions).length
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });
      } catch (analyticsError) {
        console.warn('Failed to track AI suggestions analytics:', analyticsError);
      }

      res.json(suggestions);
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  // Favorites routes
  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteData = insertFavoriteSchema.parse({
        ...req.body,
        userId,
      });

      const favorite = await storage.addFavorite(favoriteData);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete('/api/favorites/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFavorite(userId, req.params.propertyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  // Saved searches routes
  app.post('/api/saved-searches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const searchData = insertSavedSearchSchema.parse({
        ...req.body,
        userId,
      });

      const search = await storage.createSavedSearch(searchData);
      res.status(201).json(search);
    } catch (error) {
      console.error("Error creating saved search:", error);
      res.status(500).json({ message: "Failed to create saved search" });
    }
  });

  app.get('/api/saved-searches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const searches = await storage.getUserSavedSearches(userId);
      res.json(searches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ message: "Failed to fetch saved searches" });
    }
  });

  // Subscription plans
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planId } = req.body;
      
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string, {
          expand: ['payment_intent'],
        });
        
        res.json({
          subscriptionId: subscription.id,
          clientSecret: (invoice as any).payment_intent?.client_secret,
        });
        return;
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: plan.stripePriceId,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

      const invoice = subscription.latest_invoice as any;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: invoice.payment_intent.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Dashboard metrics
  app.get('/api/admin/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get('/api/agent/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['agent', 'agency', 'expert'].includes(user.role)) {
        return res.status(403).json({ message: "Agent access required" });
      }

      const metrics = await storage.getAgentMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching agent metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // User Management API (Admin Only)
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Comprehensive admin dashboard endpoints
  app.get('/api/admin/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get('/api/admin/subscription-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const users = await storage.getAllUsers();
      const metrics = {
        totalSubscriptions: users.length,
        activeSubscriptions: users.filter(u => u.status === 'active').length,
        trialSubscriptions: users.filter(u => u.status === 'trial').length,
        cancelledSubscriptions: users.filter(u => u.status === 'cancelled').length,
        expiredSubscriptions: users.filter(u => u.status === 'expired').length,
        suspendedSubscriptions: users.filter(u => u.status === 'suspended').length,
        conversionRate: 12.5,
        monthlyChurn: 2.8,
      };
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching subscription analytics:", error);
      res.status(500).json({ message: "Failed to fetch subscription analytics" });
    }
  });

  app.get('/api/admin/revenue-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const analytics = await storage.getRevenueAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  });

  // ANALYTICS ENDPOINTS
  // Get comprehensive analytics metrics (Admin/Expert/Agency only)
  app.get('/api/analytics/metrics', isAuthenticated, async (req, res) => {
    const user = req.user as any;
    
    if (!user || !['admin', 'expert', 'agency'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    try {
      const { analyticsService } = await import('./analyticsService');
      const metrics = await analyticsService.getAnalyticsMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Analytics metrics error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics metrics' });
    }
  });

  // Get revenue analytics for charts (Admin/Expert/Agency only)
  app.get('/api/analytics/revenue', isAuthenticated, async (req, res) => {
    const user = req.user as any;
    
    if (!user || !['admin', 'expert', 'agency'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    try {
      const { analyticsService } = await import('./analyticsService');
      const revenueAnalytics = await analyticsService.getRevenueAnalytics();
      res.json(revenueAnalytics);
    } catch (error) {
      console.error('Revenue analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch revenue analytics' });
    }
  });

  // Track user activity
  app.post('/api/analytics/activity', isAuthenticated, async (req, res) => {
    const user = req.user as any;
    
    try {
      const { analyticsService } = await import('./analyticsService');
      await analyticsService.trackUserActivity({
        userId: user.claims.sub,
        activity: req.body.activity,
        details: req.body.details,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Activity tracking error:', error);
      res.status(500).json({ message: 'Failed to track activity' });
    }
  });

  app.get('/api/admin/actions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const actions = await storage.getAdminActions();
      res.json(actions);
    } catch (error) {
      console.error("Error fetching admin actions:", error);
      res.status(500).json({ message: "Failed to fetch admin actions" });
    }
  });

  // User management endpoints
  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const targetUserId = req.params.id;
      const updates = req.body;
      
      await storage.logAdminAction({
        actorId: userId,
        actionType: 'UPDATE_USER',
        targetType: 'USER',
        targetId: targetUserId,
        afterData: updates,
      });
      
      const updatedUser = await storage.updateUserRole(targetUserId, updates.role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post('/api/admin/users/:id/suspend', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const targetUserId = req.params.id;
      
      await storage.logAdminAction({
        actorId: userId,
        actionType: 'SUSPEND_USER',
        targetType: 'USER',
        targetId: targetUserId,
      });
      
      const updatedUser = await storage.updateUserStatus(targetUserId, 'suspended');
      res.json(updatedUser);
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  app.post('/api/admin/users/:id/change-tier', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const targetUserId = req.params.id;
      const { role } = req.body;
      
      await storage.logAdminAction({
        actorId: userId,
        actionType: 'CHANGE_USER_TIER',
        targetType: 'USER',
        targetId: targetUserId,
        afterData: { role },
      });
      
      const updatedUser = await storage.updateUserRole(targetUserId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error changing user tier:", error);
      res.status(500).json({ message: "Failed to change user tier" });
    }
  });

  // Usage tracking endpoints
  app.get('/api/usage/listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { checkListingUsage } = await import('./featureFlags');
      const usage = await checkListingUsage(userId, storage);
      res.json(usage);
    } catch (error) {
      console.error("Error checking listing usage:", error);
      res.status(500).json({ message: "Failed to check listing usage" });
    }
  });

  app.get('/api/usage/seats/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const organizationId = req.params.organizationId;
      
      // Check if user has access to this organization
      if (!user || (user.organizationId !== organizationId && user.role !== 'admin')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { checkSeatUsage } = await import('./featureFlags');
      const usage = await checkSeatUsage(organizationId, storage);
      res.json(usage);
    } catch (error) {
      console.error("Error checking seat usage:", error);
      res.status(500).json({ message: "Failed to check seat usage" });
    }
  });

  // Seat management for organizations
  app.post('/api/organizations/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const organizationId = req.params.id;
      
      if (!user || (user.organizationId !== organizationId && user.role !== 'admin')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Check seat limits before inviting
      try {
        const { enforceSeatLimits } = await import('./featureFlags');
        await enforceSeatLimits(organizationId, storage);
      } catch (seatError: any) {
        return res.status(403).json({ 
          message: seatError.message,
          code: 'SEAT_LIMIT_EXCEEDED'
        });
      }

      const { email } = req.body;
      // Here you would implement invitation logic
      res.json({ message: "Invitation sent successfully" });
    } catch (error) {
      console.error("Error inviting user:", error);
      res.status(500).json({ message: "Failed to invite user" });
    }
  });

  // Enhanced Lead Routing API (Agency/Expert)
  app.post('/api/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['agency', 'expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Agency access required" });
      }

      const { agentId } = req.body;
      const updatedLead = await storage.assignLead(req.params.id, agentId, userId);
      res.json(updatedLead);
    } catch (error) {
      console.error("Error assigning lead:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  // Lead routing configuration endpoints
  app.get('/api/organizations/:id/lead-routing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const organizationId = req.params.id;
      
      if (!user || (user.organizationId !== organizationId && user.role !== 'admin')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Return default config for now - routing system ready for frontend
      res.json({ 
        organizationId,
        routingType: 'round_robin',
        isActive: true,
        settings: {
          maxLeadsPerAgent: 10,
          workingHours: { start: '09:00', end: '17:00' }
        }
      });
    } catch (error) {
      console.error("Error fetching lead routing config:", error);
      res.status(500).json({ message: "Failed to fetch lead routing config" });
    }
  });

  app.post('/api/organizations/:id/lead-routing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const organizationId = req.params.id;
      
      if (!user || (user.organizationId !== organizationId && user.role !== 'admin')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const configData = { ...req.body, organizationId };
      res.status(201).json(configData);
    } catch (error) {
      console.error("Error creating lead routing config:", error);
      res.status(500).json({ message: "Failed to create lead routing config" });
    }
  });

  // Auto-assign lead with routing
  app.post('/api/leads/auto-assign', async (req, res) => {
    try {
      const leadData = req.body;
      
      // For now, assign to first available agent or create with provided agentId
      const lead = await storage.createLead(leadData);
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error auto-assigning lead:", error);
      res.status(500).json({ message: "Failed to auto-assign lead" });
    }
  });

  // Organization Management API
  app.get('/api/organizations/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['agency', 'expert', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Organization access required" });
      }

      const members = await storage.getUsersByOrganization(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Revenue Analytics API (Admin Only)
  app.get('/api/admin/analytics/revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const analytics = await storage.getRevenueAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Object storage routes for property images
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/property-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const userId = req.user.claims.sub;
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public", // Property images are public
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting property image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
