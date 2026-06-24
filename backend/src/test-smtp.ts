import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env variables
dotenv.config();

async function main() {
  console.log('=== SMTP Email Tester ===');
  console.log('Loading SMTP configuration from backend/.env...');

  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT || '587';
  const port = parseInt(portStr);
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@checklisttracker.com';

  console.log(`- SMTP_HOST: ${host || '(not set)'}`);
  console.log(`- SMTP_PORT: ${portStr}`);
  console.log(`- SMTP_SECURE: ${secure}`);
  console.log(`- SMTP_USER: ${user || '(not set)'}`);
  console.log(`- SMTP_PASS: ${pass ? '********' : '(not set)'}`);
  console.log(`- SMTP_FROM: ${from}`);

  if (!host) {
    console.error('\nERROR: SMTP_HOST is not defined in your .env file!');
    console.log('The application will fall back to writing emails to: backend/uploads/emails/');
    process.exit(1);
  }

  const auth = user ? { user, pass } : undefined;

  console.log('\nInitializing transporter...');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(auth && { auth }),
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Verifying connection config...');
    await transporter.verify();
    console.log('SUCCESS: Connection configuration is valid! Ready to send emails.');

    const testRecipient = process.argv[2] || user || 'test@example.com';
    console.log(`\nAttempting to send a test invitation email to: ${testRecipient}...`);

    const info = await transporter.sendMail({
      from,
      to: testRecipient,
      subject: 'Daily Checklist Tracker - SMTP Verification Test',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4F46E5;">SMTP Service Verification</h2>
          <p>Hello,</p>
          <p>This is a test email confirming that your SMTP server configuration on the <strong>Daily Checklist Tracker</strong> is working successfully.</p>
          <p>If you received this email, the invitation member email system is fully functional!</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">Daily Checklist Tracker Inc.</p>
        </div>
      `,
    });

    console.log('SUCCESS: Email sent successfully!');
    console.log('Message ID:', info.messageId);
    if (info.envelope) {
      console.log('Envelope:', JSON.stringify(info.envelope));
    }
  } catch (err: any) {
    console.error('\nERROR: Failed to connect or send email via SMTP!');
    console.error(err);
    console.log('\nPlease verify your SMTP configuration in backend/.env.');
    process.exit(1);
  }
}

main();
