import { storage } from './storage';
import type { Lead, User } from '@shared/schema';

export interface LeadRoutingConfig {
  organizationId: string;
  routingType: 'round_robin' | 'weighted' | 'availability' | 'skill_based';
  isActive: boolean;
  settings: {
    maxLeadsPerAgent?: number;
    skillWeights?: Record<string, number>;
    availabilitySettings?: {
      workingHours: { start: string; end: string };
      timeZone: string;
    };
  };
}

export interface LeadAssignment {
  leadId: string;
  agentId: string;
  assignedAt: Date;
  assignmentReason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface LeadScore {
  propertyInterest: number; // 0-25 points
  budgetAlignment: number;  // 0-25 points
  timelineUrgency: number;  // 0-25 points
  contactPreference: number; // 0-25 points
  total: number; // 0-100
}

// Lead scoring algorithm
export function calculateLeadScore(lead: Partial<Lead>, propertyPrice?: number): LeadScore {
  let propertyInterest = 15; // Base score
  let budgetAlignment = 15;
  let timelineUrgency = 15;
  let contactPreference = 15;

  // Property interest scoring
  if (lead.message && lead.message.length > 50) {
    propertyInterest += 5; // Detailed message shows more interest
  }
  if (lead.message?.toLowerCase().includes('viewing') || lead.message?.toLowerCase().includes('tour')) {
    propertyInterest += 5; // Wants to view property
  }

  // Budget alignment (if we can infer from message or property type)
  if (propertyPrice) {
    if (propertyPrice < 300000) budgetAlignment += 5; // First-time buyer likely
    if (propertyPrice > 1000000) budgetAlignment += 3; // Luxury buyer
  }

  // Timeline urgency
  const urgentKeywords = ['urgent', 'immediately', 'asap', 'quick', 'soon'];
  const hasUrgency = urgentKeywords.some(keyword => 
    lead.message?.toLowerCase().includes(keyword)
  );
  if (hasUrgency) timelineUrgency += 10;

  // Contact preference (phone provided = higher score)
  if (lead.phone && lead.phone.length > 0) {
    contactPreference += 10; // Phone means they want direct contact
  }

  const total = Math.min(propertyInterest + budgetAlignment + timelineUrgency + contactPreference, 100);

  return {
    propertyInterest,
    budgetAlignment,
    timelineUrgency,
    contactPreference,
    total
  };
}

// Round robin assignment
export async function assignLeadRoundRobin(organizationId: string, leadId: string): Promise<string | null> {
  try {
    // Get available agents in the organization
    const agents = await storage.getOrganizationAgents(organizationId);
    if (!agents || agents.length === 0) {
      console.log(`No agents available for organization ${organizationId}`);
      return null;
    }

    // Get assignment tracking to find who should get the next lead
    const assignments = await storage.getLeadAssignmentTracking(organizationId);
    
    // Find agent with lowest assignment count who is available
    const availableAgents = agents.filter(agent => {
      const tracking = assignments.find(a => a.agentId === agent.id);
      return !tracking || tracking.isAvailable;
    });

    if (availableAgents.length === 0) {
      console.log(`No available agents for organization ${organizationId}`);
      return null;
    }

    // Sort by assignment count (ascending) and last assigned time
    const sortedAgents = availableAgents.sort((a, b) => {
      const aTracking = assignments.find(t => t.agentId === a.id);
      const bTracking = assignments.find(t => t.agentId === b.id);
      
      const aCount = aTracking?.totalAssigned || 0;
      const bCount = bTracking?.totalAssigned || 0;
      
      if (aCount !== bCount) {
        return aCount - bCount; // Lower count first
      }
      
      // If counts are equal, use last assigned time
      const aTime = aTracking?.lastAssignedAt?.getTime() || 0;
      const bTime = bTracking?.lastAssignedAt?.getTime() || 0;
      
      return aTime - bTime; // Earlier time first
    });

    const selectedAgent = sortedAgents[0];
    
    // Update assignment tracking
    await storage.updateLeadAssignmentTracking({
      organizationId,
      agentId: selectedAgent.id,
      lastAssignedAt: new Date(),
      totalAssigned: (assignments.find(a => a.agentId === selectedAgent.id)?.totalAssigned || 0) + 1
    });

    console.log(`Assigned lead ${leadId} to agent ${selectedAgent.id} via round robin`);
    return selectedAgent.id;
    
  } catch (error) {
    console.error('Error in round robin assignment:', error);
    return null;
  }
}

// Skill-based assignment
export async function assignLeadSkillBased(
  organizationId: string, 
  leadId: string,
  propertyType: string,
  priceRange: string
): Promise<string | null> {
  try {
    const agents = await storage.getOrganizationAgents(organizationId);
    if (!agents || agents.length === 0) return null;

    // Score agents based on their skills/specializations
    const agentScores = agents.map(agent => {
      let score = 0;
      
      // Property type specialization
      if (agent.specializations?.includes(propertyType)) {
        score += 30;
      }
      
      // Price range experience
      if (priceRange === 'luxury' && agent.experience?.includes('luxury')) {
        score += 20;
      }
      if (priceRange === 'first-time' && agent.experience?.includes('first-time-buyers')) {
        score += 20;
      }
      
      // General experience points
      const yearsExperience = agent.yearsExperience || 0;
      score += Math.min(yearsExperience * 2, 20); // Max 20 points for experience
      
      // Recent performance
      if (agent.recentPerformance?.conversionRate > 0.8) {
        score += 15;
      }
      
      return { agent, score };
    });

    // Sort by score and pick the best match
    const bestMatch = agentScores
      .filter(({ agent }) => agent.isAvailable)
      .sort((a, b) => b.score - a.score)[0];
    
    if (!bestMatch) return null;

    await storage.updateLeadAssignmentTracking({
      organizationId,
      agentId: bestMatch.agent.id,
      lastAssignedAt: new Date(),
      totalAssigned: (await storage.getAgentAssignmentCount(bestMatch.agent.id)) + 1
    });

    console.log(`Assigned lead ${leadId} to agent ${bestMatch.agent.id} via skill-based matching (score: ${bestMatch.score})`);
    return bestMatch.agent.id;
    
  } catch (error) {
    console.error('Error in skill-based assignment:', error);
    return null;
  }
}

// Main lead routing function
export async function routeLead(
  leadData: {
    name: string;
    email: string;
    phone?: string;
    message?: string;
    propertyId?: string;
    source: string;
  },
  organizationId?: string
): Promise<{ leadId: string; assignedAgentId: string | null; score: LeadScore }> {
  try {
    // Calculate lead score
    const score = calculateLeadScore(leadData);
    
    // Determine priority based on score
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (score.total >= 80) priority = 'urgent';
    else if (score.total >= 60) priority = 'high';
    else if (score.total >= 40) priority = 'medium';
    else priority = 'low';

    // Create the lead first
    const leadId = await storage.createLead({
      ...leadData,
      priority,
      score: score.total,
      status: 'new'
    });

    let assignedAgentId: string | null = null;

    // Route to organization if specified
    if (organizationId) {
      const routingConfig = await storage.getLeadRoutingConfig(organizationId);
      
      if (routingConfig?.isActive) {
        switch (routingConfig.routingType) {
          case 'round_robin':
            assignedAgentId = await assignLeadRoundRobin(organizationId, leadId);
            break;
          case 'skill_based':
            // Determine property context for skill-based routing
            const propertyType = 'house'; // Would be derived from property data
            const priceRange = score.budgetAlignment > 20 ? 'luxury' : 'standard';
            assignedAgentId = await assignLeadSkillBased(organizationId, leadId, propertyType, priceRange);
            break;
          default:
            assignedAgentId = await assignLeadRoundRobin(organizationId, leadId);
        }
      }
    }

    // Update lead with assignment
    if (assignedAgentId) {
      await storage.updateLeadAssignment(leadId, assignedAgentId, new Date());
    }

    console.log(`Created lead ${leadId} with score ${score.total} and assigned to agent ${assignedAgentId || 'none'}`);
    
    return {
      leadId,
      assignedAgentId,
      score
    };
    
  } catch (error) {
    console.error('Error routing lead:', error);
    throw error;
  }
}

// Lead follow-up automation
export async function scheduleLeadFollowUp(leadId: string, agentId: string, followUpDate: Date) {
  try {
    await storage.updateLeadFollowUp(leadId, followUpDate);
    
    // Here you would integrate with a scheduling system or queue
    console.log(`Scheduled follow-up for lead ${leadId} with agent ${agentId} on ${followUpDate}`);
    
    return true;
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    return false;
  }
}

// Lead conversion tracking
export async function markLeadConverted(leadId: string, conversionDetails: { dealValue?: number; closingDate?: Date }) {
  try {
    await storage.updateLeadStatus(leadId, 'converted', conversionDetails);
    
    // Update agent performance metrics
    const lead = await storage.getLead(leadId);
    if (lead?.agentId) {
      await storage.updateAgentPerformance(lead.agentId, {
        conversionsThisMonth: 1,
        totalRevenue: conversionDetails.dealValue || 0
      });
    }
    
    console.log(`Marked lead ${leadId} as converted`);
    return true;
  } catch (error) {
    console.error('Error marking lead as converted:', error);
    return false;
  }
}