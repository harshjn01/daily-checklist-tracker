import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || 'noreply@checklisttracker.com';

    // Set up Nodemailer transporter if config is present
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  private async logEmailToDisk(to: string, subject: string, html: string) {
    const logsDir = path.join(__dirname, '..', '..', 'uploads', 'emails');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const filename = `${Date.now()}-${to.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    const filepath = path.join(logsDir, filename);
    const content = `
<!--
  To: ${to}
  Subject: ${subject}
  Date: ${new Date().toISOString()}
-->
<hr>
${html}
`;
    fs.writeFileSync(filepath, content);
    console.log(`[Email Service] Mock email written to: uploads/emails/${filename}`);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to,
          subject,
          html,
        });
        console.log(`[Email Service] Email sent successfully to ${to}`);
        return true;
      } catch (err) {
        console.error(`[Email Service] Failed to send email via SMTP to ${to}`, err);
        // Fall back to disk logging
      }
    }
    await this.logEmailToDisk(to, subject, html);
    return true;
  }

  async sendInvitation(email: string, name: string, token: string) {
    const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-account?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Welcome to Daily Checklist Tracker!</h2>
        <p>Hello ${name},</p>
        <p>You have been invited by the Administrator to set up your account on the Daily Checklist Tracker.</p>
        <p>Please click the link below to set up your account and password:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${setupUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Up Account</a>
        </div>
        <p>This invitation link will expire in 24 hours.</p>
        <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #888;">${setupUrl}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="font-size: 12px; color: #999; text-align: center;">Daily Checklist Tracker Inc.</p>
      </div>
    `;
    await this.sendEmail(email, 'Invitation to Daily Checklist Tracker', html);
  }

  async sendIncompleteNotification(adminEmail: string, adminName: string, incompleteUsers: Array<{ name: string; completedCount: number; totalCount: number }>) {
    const userRows = incompleteUsers
      .map(
        (u) =>
          `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${u.name}</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #EF4444;">${u.completedCount} / ${u.totalCount} completed</td>
          </tr>`
      )
      .join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #EF4444;">Incomplete Checklist Alert</h2>
        <p>Hello ${adminName},</p>
        <p>The daily check-off run completed. The following users have incomplete checklist items for today:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #F9FAFB; text-align: left;">
              <th style="padding: 10px; border-bottom: 2px solid #eee;">User Name</th>
              <th style="padding: 10px; border-bottom: 2px solid #eee;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${userRows}
          </tbody>
        </table>
        <p>Click <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reports" style="color: #4F46E5;">here</a> to view full reports.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="font-size: 12px; color: #999; text-align: center;">Daily Checklist Tracker Inc.</p>
      </div>
    `;
    await this.sendEmail(adminEmail, 'Daily Checklist Alert - Incomplete Tasks', html);
  }

  async sendDailyReminder(email: string, name: string, pendingCount: number) {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/dashboard`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #F59E0B;">Friendly Reminder!</h2>
        <p>Hello ${name},</p>
        <p>You still have <strong>${pendingCount}</strong> pending tasks on your checklist for today.</p>
        <p>Please make sure to complete and mark them off before the day ends.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${dashboardUrl}" style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="font-size: 12px; color: #999; text-align: center;">Daily Checklist Tracker Inc.</p>
      </div>
    `;
    await this.sendEmail(email, 'Reminder: Pending Checklist Tasks', html);
  }
}
