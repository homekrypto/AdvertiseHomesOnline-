import Stripe from 'stripe';
import { storage } from './storage';
import { getFeatureFlagsForRole } from './featureFlags';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

type UserRole = 'free' | 'registered' | 'premium' | 'agent' | 'agency' | 'expert' | 'admin';

// Simplified webhook handler that works with existing storage interface
export async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    console.log(`Processing subscription ${subscription.status} for customer ${subscription.customer}`);
    
    // For now, just log the event - implement full user updates when storage interface is extended
    const eventData = {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      priceId: subscription.items.data[0]?.price.id
    };
    
    console.log('Subscription webhook data:', eventData);
    
    // TODO: Implement user role updates when storage methods are available
    return eventData;
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

// Handle subscription deleted events
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log(`Processing subscription deletion for customer ${subscription.customer}`);
    return { subscriptionId: subscription.id, status: 'deleted' };
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}

// Handle payment success events
export async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  try {
    console.log(`Processing payment success for invoice ${invoice.id}`);
    return { invoiceId: invoice.id, amount: invoice.amount_paid };
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

// Handle payment failure events
export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log(`Processing payment failure for invoice ${invoice.id}`);
    return { invoiceId: invoice.id, amount: invoice.amount_due };
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

function getEventType(subscriptionStatus: string): string {
  switch (subscriptionStatus) {
    case 'active':
      return 'subscription_renewed';
    case 'trialing':
      return 'subscription_created';
    case 'past_due':
      return 'payment_failed';
    case 'canceled':
    case 'unpaid':
      return 'subscription_cancelled';
    default:
      return 'subscription_updated';
  }
}

// Main webhook handler
export async function handleStripeWebhook(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error);
    throw error;
  }
}