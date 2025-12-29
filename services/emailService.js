/**
 * Email Notification Service
 * Handles all email communications for NexusHub
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.configured = false;
    this.transporter = null;
    
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };
    
    this.from = process.env.SMTP_FROM || 'NexusHub <noreply@nexushub.com>';
    
    // Check if SMTP is configured
    if (!this.config.auth.user || !this.config.auth.pass) {
      console.warn('⚠️  SMTP credentials not configured. Email notifications will be disabled.');
      return;
    }
    
    try {
      this.transporter = nodemailer.createTransport(this.config);
      this.configured = true;
      console.log('✓ Email service initialized');
    } catch (error) {
      console.error('✗ Email service initialization failed:', error.message);
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>}
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.configured) {
      console.log('Email not sent (service disabled):', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      });

      console.log('✓ Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('✗ Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(user) {
    const roleNames = {
      SYSTEM_ADMIN: 'System Administrator',
      CENTER_ADMIN: 'Center Administrator',
      MENTOR: 'Mentor',
      STUDENT: 'Student'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Welcome to NexusHub!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.fullName || user.username},</p>
            
            <p>Welcome to NexusHub - your AI-powered project incubation and learning platform!</p>
            
            <p><strong>Your Account Details:</strong></p>
            <ul>
              <li>Email: ${user.email}</li>
              <li>Username: ${user.username}</li>
              <li>Role: ${roleNames[user.role] || user.role}</li>
            </ul>
            
            <p>You can now access your personalized dashboard and start your journey:</p>
            
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" class="button">
              Go to Dashboard
            </a>
            
            <p><strong>What's Next?</strong></p>
            ${this.getRoleSpecificWelcomeContent(user.role)}
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>The NexusHub Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} NexusHub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `Welcome to NexusHub, ${user.fullName || user.username}!`,
      html
    });
  }

  /**
   * Get role-specific welcome content
   */
  getRoleSpecificWelcomeContent(role) {
    const content = {
      SYSTEM_ADMIN: `
        <ul>
          <li>Review and approve pending center applications</li>
          <li>Manage escrow vault and fund releases</li>
          <li>Monitor platform analytics and performance</li>
        </ul>
      `,
      CENTER_ADMIN: `
        <ul>
          <li>Wait for system admin approval (if pending)</li>
          <li>Upload showcase projects for students</li>
          <li>Manage your mentors and resources</li>
          <li>Issue Smart QR Certificates upon project completion</li>
        </ul>
      `,
      MENTOR: `
        <ul>
          <li>Get assigned to a center by a Center Admin</li>
          <li>Conduct Shadow Coding sessions with students</li>
          <li>Provide real-time guidance in the Virtual Lab</li>
          <li>Review and approve student milestones</li>
        </ul>
      `,
      STUDENT: `
        <ul>
          <li>Form a group of up to 3 members</li>
          <li>Browse and purchase project ideas from verified centers</li>
          <li>Collaborate in the Virtual Lab with your mentor</li>
          <li>Earn Smart QR Certificates upon completion</li>
        </ul>
      `
    };

    return content[role] || '<p>Explore the platform and discover all features!</p>';
  }

  /**
   * Send center approval notification
   */
  async sendCenterApprovalEmail(center, approved = true) {
    const subject = approved 
      ? '✅ Your Center Has Been Approved!'
      : '❌ Center Application Status';

    const html = approved ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
          </div>
          <div class="content">
            <p>Great news! Your center <strong>${center.name}</strong> has been approved.</p>
            
            <p>You can now:</p>
            <ul>
              <li>Upload showcase projects to the marketplace</li>
              <li>Assign mentors to guide students</li>
              <li>Issue Smart QR Certificates</li>
              <li>Manage your center's operations</li>
            </ul>
            
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/center-admin/dashboard" class="button">
              Go to Center Dashboard
            </a>
            
            <p>Best regards,<br>The NexusHub Team</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Center Application Update</h1>
          </div>
          <div class="content">
            <p>Thank you for your interest in NexusHub.</p>
            
            <p>Unfortunately, your center application for <strong>${center.name}</strong> has not been approved at this time.</p>
            
            <p>If you have questions or would like to reapply, please contact our support team.</p>
            
            <p>Best regards,<br>The NexusHub Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: center.email,
      subject,
      html
    });
  }

  /**
   * Send project purchase confirmation
   */
  async sendPurchaseConfirmation(student, project, transaction) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .invoice { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Purchase Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${student.fullName || student.username},</p>
            
            <p>Your purchase has been confirmed and funds are now held in escrow.</p>
            
            <div class="invoice">
              <h3>Purchase Details:</h3>
              <p><strong>Project:</strong> ${project.title}</p>
              <p><strong>Amount:</strong> $${transaction.amount}</p>
              <p><strong>Transaction ID:</strong> ${transaction.id}</p>
              <p><strong>Status:</strong> Escrow (Held)</p>
            </div>
            
            <p><strong>What Happens Next?</strong></p>
            <ul>
              <li>Funds are securely held in escrow</li>
              <li>You can start working on the project with your group</li>
              <li>Attend Virtual Lab sessions with your mentor</li>
              <li>Submit milestones for approval</li>
              <li>Receive your Smart QR Certificate upon completion</li>
              <li>Funds will be released to the center after certificate issuance</li>
            </ul>
            
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/student/projects" class="button">
              View My Projects
            </a>
            
            <p>Best regards,<br>The NexusHub Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: student.email,
      subject: `Purchase Confirmed: ${project.title}`,
      html
    });
  }

  /**
   * Send Virtual Lab session reminder
   */
  async sendLabSessionReminder(student, session) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .session-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧪 Upcoming Virtual Lab Session</h1>
          </div>
          <div class="content">
            <p>Hi ${student.fullName || student.username},</p>
            
            <p>Reminder: You have a Virtual Lab session scheduled soon!</p>
            
            <div class="session-details">
              <h3>Session Details:</h3>
              <p><strong>Title:</strong> ${session.title}</p>
              <p><strong>Time:</strong> ${new Date(session.scheduled_at).toLocaleString()}</p>
              <p><strong>Mentor:</strong> ${session.mentorName}</p>
              <p><strong>Description:</strong> ${session.description || 'Shadow Coding Session'}</p>
            </div>
            
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/student/virtual-lab?session=${session.id}" class="button">
              Join Virtual Lab
            </a>
            
            <p>Make sure to be ready 5 minutes before the session starts!</p>
            
            <p>Best regards,<br>The NexusHub Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: student.email,
      subject: `Reminder: Virtual Lab Session - ${session.title}`,
      html
    });
  }

  /**
   * Strip HTML tags from text
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    return this.configured;
  }
}

// Singleton instance
let emailServiceInstance = null;

/**
 * Get Email Service instance
 * @returns {EmailService}
 */
function getEmailService() {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

module.exports = {
  EmailService,
  getEmailService
};
