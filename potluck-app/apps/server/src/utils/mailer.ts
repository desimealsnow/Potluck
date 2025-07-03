import nodemailer from 'nodemailer';

// Configure your SMTP transporter via environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface InviteContext {
  participantName: string;
  eventName: string;
  eventDate: string; // ISO string
}

/**
 * Send an invitation email to a participant.
 */
export async function sendInviteEmail(
  to: string,
  { participantName, eventName, eventDate }: InviteContext
): Promise<void> {
  const dateFormatted = new Date(eventDate).toLocaleString();
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to,
    subject: `Invitation: ${eventName}`,
    html: `
      <p>Hi ${participantName},</p>
      <p>You are invited to <strong>${eventName}</strong> on <em>${dateFormatted}</em>.</p>
      <p>Please <a href="${process.env.APP_URL}/events/${eventName}">view event details</a> and RSVP.</p>
      <p>Thanks!</p>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Invite email sent:', info.messageId);
}
