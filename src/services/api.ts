import { Admin, Advisor, Appointment, BookingFormState } from '../types';

const API_BASE = '/api';

export function getAdminToken(): string | null {
  return localStorage.getItem('bimadost_admin_token');
}

export function setAdminToken(token: string | null): void {
  if (token) {
    localStorage.setItem('bimadost_admin_token', token);
  } else {
    localStorage.removeItem('bimadost_admin_token');
  }
}

async function request(url: string, options: RequestInit = {}) {
  const adminToken = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Public Configuration
  async getConfig() {
    return request(`${API_BASE}/config`);
  },

  // 1. Appointment Booking: Initiate
  async initiateBooking(data: BookingFormState): Promise<{
    message: string;
    appointment: {
      id: string;
      docketNumber: string;
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      preferredDate: string;
      preferredTime: string;
      totalAmount: number;
      status: string;
      paymentStatus: string;
    };
    razorpayOrder: {
      id: string;
      amount: number;
      currency: string;
      keyId: string;
    };
  }> {
    return request(`${API_BASE}/appointments/initiate-booking`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 2. Razorpay Verification
  async verifyRazorpayPayment(payload: {
    appointmentId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    paymentMethod?: string;
  }): Promise<{
    success: boolean;
    message: string;
    appointment: Appointment;
    receipt: {
      receiptNumber: string;
      razorpayPaymentId: string;
      amount: number;
      verifiedAt: string;
    };
  }> {
    return request(`${API_BASE}/payments/razorpay/verify`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 3. Razorpay Cancel/Fail
  async cancelRazorpayPayment(payload: {
    appointmentId?: string;
    razorpay_order_id?: string;
    reason?: string;
  }) {
    return request(`${API_BASE}/payments/razorpay/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 4. Public Tracking
  async trackAppointment(docketOrId: string): Promise<{
    appointment: Appointment;
    payment?: any;
  }> {
    return request(`${API_BASE}/appointments/track/${encodeURIComponent(docketOrId)}`);
  },

  // 5. Admin Authentication
  async adminLogin(email: string, password: string): Promise<{
    message: string;
    token: string;
    admin: Admin;
  }> {
    const res = await request(`${API_BASE}/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAdminToken(res.token);
    return res;
  },

  async adminMe(): Promise<{ admin: Admin }> {
    return request(`${API_BASE}/admin/me`);
  },

  async adminLogout(): Promise<void> {
    try {
      await request(`${API_BASE}/admin/logout`, { method: 'POST' });
    } finally {
      setAdminToken(null);
    }
  },

  // 6. Admin Dashboard Operations
  async getAdminAppointments(params?: {
    status?: string;
    payment_status?: string;
    search?: string;
  }): Promise<{
    appointments: Appointment[];
    counts: {
      total: number;
      awaiting_approval: number;
      approved: number;
      rejected: number;
      completed: number;
      awaiting_payment: number;
      cancelled_refunded: number;
    };
  }> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.payment_status) qs.set('payment_status', params.payment_status);
    if (params?.search) qs.set('search', params.search);

    const queryStr = qs.toString();
    return request(`${API_BASE}/admin/appointments${queryStr ? `?${queryStr}` : ''}`);
  },

  async getAdminAppointment(id: string): Promise<{
    appointment: Appointment;
    payment?: any;
  }> {
    return request(`${API_BASE}/admin/appointments/${encodeURIComponent(id)}`);
  },

  async approveAppointment(id: string, googleMeetUrl?: string, adminNotes?: string): Promise<{
    success: boolean;
    message: string;
    appointment: Appointment;
  }> {
    return request(`${API_BASE}/admin/appointments/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ googleMeetUrl, adminNotes })
    });
  },

  async rejectAppointment(id: string, rejectionReason: string, initiateRefund: boolean = true): Promise<{
    success: boolean;
    message: string;
    appointment: Appointment;
  }> {
    return request(`${API_BASE}/admin/appointments/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason, initiateRefund })
    });
  },

  async completeAppointment(id: string): Promise<{
    success: boolean;
    message: string;
    appointment: Appointment;
  }> {
    return request(`${API_BASE}/admin/appointments/${encodeURIComponent(id)}/complete`, {
      method: 'POST'
    });
  },

  // 7. Advisors Catalog
  async getAdvisors(): Promise<{ advisors: Advisor[] }> {
    return request(`${API_BASE}/advisors`);
  },

  // 8. Claim Quick Analysis
  async analyzeClaim(grievanceCategory: string, insurer: string, claimAmount: string) {
    return request(`${API_BASE}/claim/analyze`, {
      method: 'POST',
      body: JSON.stringify({ grievanceCategory, insurer, claimAmount })
    });
  },

  // 9. Integration Setup Status & Notification Delivery Logs
  async getConfigStatus(): Promise<{
    whatsapp: { configured: boolean; phoneNumberId: string | null };
    resend: { configured: boolean; fromAddress: string };
    googleCalendar: { configured: boolean; calendarId: string };
    razorpay: { configured: boolean; keyId: string };
  }> {
    return request(`${API_BASE}/admin/config-status`);
  },

  async getAppointmentNotifications(appointmentId: string): Promise<{
    notifications: Array<{
      id: string;
      appointment_id: string;
      channel: 'whatsapp' | 'email';
      recipient: string;
      workflow: string;
      subject: string | null;
      message_body: string;
      status: 'pending' | 'sent' | 'failed' | 'skipped';
      service_response: string | null;
      error_details: string | null;
      attempts: number;
      created_at: string;
      updated_at: string;
    }>;
  }> {
    return request(`${API_BASE}/admin/notifications/${encodeURIComponent(appointmentId)}`);
  },

  async retryNotification(notificationId: string) {
    return request(`${API_BASE}/admin/notifications/${encodeURIComponent(notificationId)}/retry`, {
      method: 'POST'
    });
  },

  // 10. Gemini Multilingual Chatbot (Requirement 8)
  async sendMessageToChatbot(message: string, history: Array<{ role: 'user' | 'model'; text: string }> = []): Promise<{
    reply: string;
    suggestBooking: boolean;
    error?: string;
  }> {
    return request(`${API_BASE}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history })
    });
  }
};
