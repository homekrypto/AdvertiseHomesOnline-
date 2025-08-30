// Email and SMS notification service for real estate platform
// This service handles lead notifications, property alerts, and system notifications

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SMSTemplate {
  message: string;
}

export interface NotificationData {
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  agentName?: string;
  propertyTitle?: string;
  propertyPrice?: string;
  propertyAddress?: string;
  leadMessage?: string;
  leadPhone?: string;
  leadEmail?: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
  customData?: Record<string, any>;
}

// Email templates for different notification types
export const emailTemplates = {
  newLeadToAgent: (data: NotificationData): EmailTemplate => ({
    subject: `🏠 New Lead: ${data.recipientName || 'Potential Client'} - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1>🏠 New Lead Alert</h1>
          <p style="font-size: 16px; margin: 0;">You have a new potential client!</p>
        </div>
        
        <div style="padding: 20px; background-color: #f8fafc;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
            <h2 style="color: #1e40af; margin-top: 0;">Lead Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Name:</td>
                <td style="padding: 8px 0; color: #6b7280;">${data.recipientName || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
                <td style="padding: 8px 0; color: #6b7280;">${data.leadEmail || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Phone:</td>
                <td style="padding: 8px 0; color: #6b7280;">${data.leadPhone || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Urgency:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: ${getUrgencyColor(data.urgencyLevel)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${(data.urgencyLevel || 'medium').toUpperCase()}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1e40af; margin-top: 0;">Property Interest</h3>
            <p><strong>Property:</strong> ${data.propertyTitle || 'Property inquiry'}</p>
            <p><strong>Price:</strong> ${data.propertyPrice || 'Not specified'}</p>
            <p><strong>Address:</strong> ${data.propertyAddress || 'Not specified'}</p>
          </div>

          ${data.leadMessage ? `
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1e40af; margin-top: 0;">Client Message</h3>
            <p style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; font-style: italic;">
              "${data.leadMessage}"
            </p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 20px;">
            <a href="#" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Lead in Dashboard
            </a>
          </div>
        </div>

        <div style="background-color: #374151; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>This is an automated notification from AdvertiseHomes.Online</p>
          <p>Respond quickly to maximize your conversion rate!</p>
        </div>
      </div>
    `,
    text: `
New Lead Alert!

Lead Information:
- Name: ${data.recipientName || 'Not provided'}
- Email: ${data.leadEmail || 'Not provided'}
- Phone: ${data.leadPhone || 'Not provided'}
- Urgency: ${(data.urgencyLevel || 'medium').toUpperCase()}

Property Interest:
- Property: ${data.propertyTitle || 'Property inquiry'}
- Price: ${data.propertyPrice || 'Not specified'}
- Address: ${data.propertyAddress || 'Not specified'}

${data.leadMessage ? `Client Message: "${data.leadMessage}"` : ''}

Log into your dashboard to respond to this lead.
AdvertiseHomes.Online - Automated Notification
    `
  }),

  propertyAlert: (data: NotificationData): EmailTemplate => ({
    subject: `🔔 New Property Alert: ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #059669; color: white; padding: 20px; text-align: center;">
          <h1>🔔 Property Alert</h1>
          <p style="font-size: 16px; margin: 0;">A new property matching your criteria is available!</p>
        </div>
        
        <div style="padding: 20px; background-color: #f8fafc;">
          <div style="background-color: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #059669; margin-top: 0;">${data.propertyTitle}</h2>
            <p><strong>Price:</strong> ${data.propertyPrice}</p>
            <p><strong>Address:</strong> ${data.propertyAddress}</p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="#" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Property Details
              </a>
            </div>
          </div>
        </div>
      </div>
    `,
    text: `
Property Alert!

${data.propertyTitle}
Price: ${data.propertyPrice}
Address: ${data.propertyAddress}

View full details on AdvertiseHomes.Online
    `
  }),

  subscriptionUpdate: (data: NotificationData): EmailTemplate => ({
    subject: `✅ Subscription Updated - Welcome to ${data.customData?.newTier || 'Premium'}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #7c3aed; color: white; padding: 20px; text-align: center;">
          <h1>✅ Subscription Updated</h1>
          <p style="font-size: 16px; margin: 0;">Welcome to ${data.customData?.newTier || 'Premium'}!</p>
        </div>
        
        <div style="padding: 20px; background-color: #f8fafc;">
          <div style="background-color: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #7c3aed; margin-top: 0;">Your New Features</h2>
            <p>Your subscription has been updated and new features are now available:</p>
            <ul>
              ${data.customData?.features?.map((feature: string) => `<li>${feature}</li>`).join('') || '<li>Premium features activated</li>'}
            </ul>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="#" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Explore New Features
              </a>
            </div>
          </div>
        </div>
      </div>
    `,
    text: `
Subscription Updated!

Welcome to ${data.customData?.newTier || 'Premium'}!

Your new features are now available. Log into your dashboard to explore them.

AdvertiseHomes.Online
    `
  })
};

// SMS templates for different notification types
export const smsTemplates = {
  newLeadToAgent: (data: NotificationData): SMSTemplate => ({
    message: `🏠 NEW LEAD ALERT: ${data.recipientName || 'Client'} is interested in ${data.propertyTitle || 'your property'}. Urgency: ${(data.urgencyLevel || 'MEDIUM').toUpperCase()}. Check your dashboard to respond quickly! - AdvertiseHomes.Online`
  }),

  leadFollowUp: (data: NotificationData): SMSTemplate => ({
    message: `📞 FOLLOW-UP REMINDER: Contact ${data.recipientName || 'your lead'} about ${data.propertyTitle || 'the property'}. Best response time is within 5 minutes of inquiry. - AdvertiseHomes.Online`
  }),

  urgentLead: (data: NotificationData): SMSTemplate => ({
    message: `🚨 URGENT LEAD: ${data.recipientName || 'Client'} needs immediate assistance with ${data.propertyTitle || 'property inquiry'}. Call ${data.leadPhone || 'them'} now! - AdvertiseHomes.Online`
  })
};

function getUrgencyColor(urgency?: string): string {
  switch (urgency) {
    case 'urgent': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    case 'low': return '#16a34a';
    default: return '#d97706';
  }
}

// Mock email service (replace with real service like SES, SendGrid, etc.)
export class EmailService {
  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      // Mock implementation - in production, integrate with SES, SendGrid, etc.
      console.log(`📧 EMAIL SENT TO: ${to}`);
      console.log(`📧 SUBJECT: ${template.subject}`);
      console.log(`📧 CONTENT: ${template.text.substring(0, 100)}...`);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendBulkEmails(recipients: string[], template: EmailTemplate): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const success = await this.sendEmail(recipient, template);
      if (success) sent++;
      else failed++;
    }

    return { sent, failed };
  }
}

// Mock SMS service (replace with real service like Twilio, SNS, etc.)
export class SMSService {
  async sendSMS(to: string, template: SMSTemplate): Promise<boolean> {
    try {
      // Mock implementation - in production, integrate with Twilio, SNS, etc.
      console.log(`📱 SMS SENT TO: ${to}`);
      console.log(`📱 MESSAGE: ${template.message}`);
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }
}

// Main notification service
export class NotificationService {
  private emailService: EmailService;
  private smsService: SMSService;

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  // Send new lead notification to agent
  async notifyNewLead(agentEmail: string, agentPhone: string | undefined, leadData: NotificationData): Promise<void> {
    try {
      // Send email notification
      const emailTemplate = emailTemplates.newLeadToAgent(leadData);
      await this.emailService.sendEmail(agentEmail, emailTemplate);

      // Send SMS for urgent leads or if agent prefers SMS
      if (agentPhone && (leadData.urgencyLevel === 'urgent' || leadData.urgencyLevel === 'high')) {
        const smsTemplate = smsTemplates.newLeadToAgent(leadData);
        await this.smsService.sendSMS(agentPhone, smsTemplate);
      }

      console.log(`✅ Lead notifications sent to agent: ${agentEmail}`);
    } catch (error) {
      console.error('Error sending lead notification:', error);
    }
  }

  // Send property alert to subscribers
  async sendPropertyAlert(subscribers: string[], propertyData: NotificationData): Promise<void> {
    try {
      const template = emailTemplates.propertyAlert(propertyData);
      const result = await this.emailService.sendBulkEmails(subscribers, template);
      
      console.log(`📧 Property alert sent: ${result.sent} successful, ${result.failed} failed`);
    } catch (error) {
      console.error('Error sending property alert:', error);
    }
  }

  // Send subscription update notification
  async notifySubscriptionUpdate(userEmail: string, subscriptionData: NotificationData): Promise<void> {
    try {
      const template = emailTemplates.subscriptionUpdate(subscriptionData);
      await this.emailService.sendEmail(userEmail, template);
      
      console.log(`✅ Subscription update notification sent to: ${userEmail}`);
    } catch (error) {
      console.error('Error sending subscription notification:', error);
    }
  }

  // Send follow-up reminder to agent
  async sendFollowUpReminder(agentEmail: string, agentPhone: string | undefined, leadData: NotificationData): Promise<void> {
    try {
      // Send SMS reminder for follow-ups
      if (agentPhone) {
        const smsTemplate = smsTemplates.leadFollowUp(leadData);
        await this.smsService.sendSMS(agentPhone, smsTemplate);
      }

      console.log(`📞 Follow-up reminder sent to agent: ${agentEmail}`);
    } catch (error) {
      console.error('Error sending follow-up reminder:', error);
    }
  }

  // Send urgent lead alert
  async sendUrgentLeadAlert(agentEmail: string, agentPhone: string | undefined, leadData: NotificationData): Promise<void> {
    try {
      // For urgent leads, send both email and SMS immediately
      const emailTemplate = emailTemplates.newLeadToAgent({ ...leadData, urgencyLevel: 'urgent' });
      await this.emailService.sendEmail(agentEmail, emailTemplate);

      if (agentPhone) {
        const smsTemplate = smsTemplates.urgentLead(leadData);
        await this.smsService.sendSMS(agentPhone, smsTemplate);
      }

      console.log(`🚨 Urgent lead alert sent to agent: ${agentEmail}`);
    } catch (error) {
      console.error('Error sending urgent lead alert:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();