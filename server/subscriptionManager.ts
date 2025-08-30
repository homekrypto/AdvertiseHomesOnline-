import type { User, UserRole, SubscriptionStatus } from "@shared/schema";
import { getFeatureFlagsForRole } from "./featureFlags";
import { storage } from "./storage";

export class SubscriptionManager {
  // Initialize user with feature flags based on role
  static async initializeUserFeatureFlags(userId: string, role: UserRole): Promise<void> {
    const featureFlags = getFeatureFlagsForRole(role);
    await storage.updateUserFeatureFlags(userId, featureFlags);
  }

  // Handle subscription status changes
  static async handleSubscriptionStatusChange(
    userId: string, 
    newStatus: SubscriptionStatus,
    newRole?: UserRole
  ): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    // Update role if provided
    if (newRole && newRole !== user.role) {
      await storage.updateUserRole(userId, newRole);
      await this.initializeUserFeatureFlags(userId, newRole);
    }

    // Handle different status changes
    switch (newStatus) {
      case 'trial':
        // Grant trial access
        await this.handleTrialStart(userId);
        break;
        
      case 'active':
        // Grant full access
        await this.handleSubscriptionActivation(userId);
        break;
        
      case 'cancelled':
        // Mark for end of period access
        await this.handleSubscriptionCancellation(userId);
        break;
        
      case 'expired':
        // Downgrade access
        await this.handleSubscriptionExpiration(userId);
        break;
        
      case 'suspended':
        // Suspend access
        await this.handleSubscriptionSuspension(userId);
        break;
    }
  }

  // Handle trial start
  static async handleTrialStart(userId: string): Promise<void> {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial
    
    await storage.updateUserTrialStatus(userId, 'trial', trialEnd);
  }

  // Handle subscription activation
  static async handleSubscriptionActivation(userId: string): Promise<void> {
    await storage.updateUserStatus(userId, 'active');
  }

  // Handle subscription cancellation
  static async handleSubscriptionCancellation(userId: string): Promise<void> {
    await storage.updateUserStatus(userId, 'cancelled');
    // Note: Access continues until current_period_end
  }

  // Handle subscription expiration
  static async handleSubscriptionExpiration(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    // Downgrade based on previous tier
    let newRole: UserRole = 'registered';
    if (user.role === 'premium') newRole = 'registered';
    if (user.role === 'agent') newRole = 'registered';
    if (user.role === 'agency') newRole = 'agent'; // Temporary downgrade
    if (user.role === 'expert') newRole = 'agency'; // Temporary downgrade

    await storage.updateUserRole(userId, newRole);
    await this.initializeUserFeatureFlags(userId, newRole);
    await storage.updateUserStatus(userId, 'expired');
  }

  // Handle subscription suspension
  static async handleSubscriptionSuspension(userId: string): Promise<void> {
    await storage.updateUserStatus(userId, 'suspended');
    // Suspend access but preserve data
  }

  // Check if user's subscription is valid
  static isSubscriptionValid(user: User): boolean {
    if (user.status === 'active') return true;
    if (user.status === 'trial' && user.trialEnd && new Date() < new Date(user.trialEnd)) return true;
    if (user.status === 'cancelled' && user.currentPeriodEnd && new Date() < new Date(user.currentPeriodEnd)) return true;
    
    return false;
  }

  // Get subscription details
  static getSubscriptionDetails(user: User) {
    return {
      status: user.status,
      role: user.role,
      trialEnd: user.trialEnd,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      isValid: this.isSubscriptionValid(user),
    };
  }
}