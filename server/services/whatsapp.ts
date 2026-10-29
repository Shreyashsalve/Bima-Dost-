export interface WhatsAppResult {
  success: boolean;
  configured: boolean;
  skipped: boolean;
  messageId?: string;
  error?: string;
  response?: any;
}

export function isWhatsAppConfigured(): boolean {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return Boolean(
    token &&
    phoneNumberId &&
    token.trim() !== '' &&
    phoneNumberId.trim() !== '' &&
    !token.includes('YourWhatsApp') &&
    !phoneNumberId.includes('YourPhone')
  );
}

export async function sendWhatsAppMessage(
  recipientPhone: string,
  messageText: string
): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) {
    return {
      success: false,
      configured: false,
      skipped: true,
      error: 'WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set). Notification skipped safely.'
    };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

  // Sanitize phone number (remove +, spaces, hyphens)
  let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
  // Default to 91 country code if 10 digits
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: messageText
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data.error?.message || `WhatsApp API error (status ${res.status})`;
      return {
        success: false,
        configured: true,
        skipped: false,
        error: errMsg,
        response: data
      };
    }

    const messageId = data.messages?.[0]?.id || 'wamid_success';
    return {
      success: true,
      configured: true,
      skipped: false,
      messageId,
      response: data
    };
  } catch (err: any) {
    return {
      success: false,
      configured: true,
      skipped: false,
      error: err.message || 'Network error calling WhatsApp Cloud API'
    };
  }
}
