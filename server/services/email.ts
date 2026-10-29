export interface EmailResult {
  success: boolean;
  configured: boolean;
  messageId?: string;
  error?: string;
  response?: any;
}

export function isResendConfigured(): boolean {
  const apiKey = process.env.RESEND_API_KEY;
  return Boolean(apiKey && !apiKey.includes('re_YourResendApiKey') && apiKey.trim() !== '');
}

export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.includes('re_YourResendApiKey')) {
    return {
      success: false,
      configured: false,
      error: 'Resend email provider not configured. Set RESEND_API_KEY in environment variables.'
    };
  }

  const from = process.env.EMAIL_FROM || 'Bima Dost Notifications <onboarding@resend.dev>';
  const recipients = Array.isArray(to) ? to : [to];

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ' ')
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data.message || data.error || `Resend API error (${res.status})`;
      return {
        success: false,
        configured: true,
        error: errMsg,
        response: data
      };
    }

    return {
      success: true,
      configured: true,
      messageId: data.id || 'resend_email_id',
      response: data
    };
  } catch (err: any) {
    return {
      success: false,
      configured: true,
      error: err.message || 'Network error sending email via Resend'
    };
  }
}
