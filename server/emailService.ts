import { randomBytes } from "crypto";
import nodemailer from 'nodemailer';

// Email service for sending verification codes
export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure Hostinger SMTP using environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER || 'support@advertisehomes.online',
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  generateVerificationCode(): string {
    // Generate 6-digit secure verification code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: 'AdvertiseHomes.Online <support@advertisehomes.online>',
        to: email,
        subject: 'Verify your AdvertiseHomes.Online account',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin: 0;">AdvertiseHomes.Online</h1>
                <p style="color: #6b7280; margin: 5px 0 0 0;">Real Estate Platform</p>
              </div>
              
              <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; text-align: center;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0;">Welcome to AdvertiseHomes.Online!</h2>
                <p style="color: #4b5563; margin: 0 0 30px 0; font-size: 16px;">
                  Please verify your email address using the code below:
                </p>
                
                <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">
                    ${code}
                  </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                  This code expires in 24 hours.
                </p>
              </div>
              
              <div style="margin-top: 30px; text-align: center;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                  If you didn't create an account, please ignore this email.
                </p>
                <p style="color: #9ca3af; font-size: 14px; margin: 10px 0 0 0;">
                  © 2025 AdvertiseHomes.Online. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      console.log(`📧 Sending verification email to: ${email} using SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent successfully to: ${email}`);
      
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, tierName: string): Promise<boolean> {
    try {
      const tierBenefits = this.getTierBenefits(tierName);
      
      const mailOptions = {
        from: 'AdvertiseHomes.Online <support@advertisehomes.online>',
        to: email,
        subject: `Welcome to AdvertiseHomes.Online - ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} Plan`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to AdvertiseHomes.Online</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin: 0;">🎉 Welcome to AdvertiseHomes.Online!</h1>
                <p style="color: #6b7280; margin: 5px 0 0 0;">Your ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} Plan is now active</p>
              </div>
              
              <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0;">Thank you for joining us!</h2>
                <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px;">
                  Your account is now active and ready to use. Here's what you get with your ${tierName} plan:
                </p>
                
                <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  ${tierBenefits}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://advertisehomes.online'}" 
                     style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Start Using Your Account
                  </a>
                </div>
              </div>
              
              <div style="margin-top: 30px; text-align: center;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                  Need help? Reply to this email or contact support@advertisehomes.online
                </p>
                <p style="color: #9ca3af; font-size: 14px; margin: 10px 0 0 0;">
                  © 2025 AdvertiseHomes.Online. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      console.log(`📧 Sending welcome email to: ${email}`);
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent successfully to: ${email}`);

      return true;
    } catch (error) {
      console.error('❌ Welcome email failed:', error);
      return false;
    }
  }

  /**
   * Gets tier-specific benefits for welcome email
   */
  private getTierBenefits(tier: string): string {
    const benefits = {
      free: [
        'Access to property search',
        'Basic property viewing',
        'Community forums access',
      ],
      premium: [
        'Up to 10 property listings',
        'Basic analytics dashboard',
        'Email support',
        'Mobile app access',
      ],
      agent: [
        'Up to 50 property listings',
        'Advanced analytics',
        'Priority email support',
        'CRM integration',
        'Lead management tools',
      ],
      agency: [
        'Up to 200 property listings',
        'Team collaboration (10 seats)',
        'Advanced CRM features',
        'Bulk property import',
        'Custom branding',
        'API access',
      ],
      expert: [
        'Unlimited property listings',
        'Enterprise team management (25 seats)',
        'White-label solutions',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced reporting',
      ],
    };

    const selectedBenefits = benefits[tier as keyof typeof benefits] || benefits.premium;
    return selectedBenefits.map(benefit => `<div style="margin: 8px 0; color: #4b5563;">✓ ${benefit}</div>`).join('');
  }
}

export const emailService = EmailService.getInstance();