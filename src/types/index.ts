export interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
}

export type AppointmentStatus =
  | 'awaiting_payment'
  | 'payment_verified_awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled_refunded';

export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';

export interface Appointment {
  id: string;
  docket_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  preferred_date: string;
  preferred_time: string;
  insurance_concern: string;
  insurance_company: string;
  preferred_language: string;
  fee: number;
  tax: number;
  total_amount: number;
  payment_status: PaymentStatus;
  status: AppointmentStatus;
  google_meet_url?: string | null;
  rejection_reason?: string | null;
  admin_notes?: string | null;
  notification_status: string;
  created_at: string;
  updated_at: string;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  payment_method?: string | null;
}

export interface Advisor {
  id: string;
  name: string;
  title: string;
  experience: string;
  languages: string[];
  rating: number;
  reviewsCount: number;
  availableDays: string[];
  slots: string[];
  avatar: string;
  specialization: string;
  barCouncilOrLicence: string;
}

export type Language = 'en' | 'hi' | 'mr';

export interface BookingFormState {
  fullName: string;
  phone: string;
  email: string;
  date: string;
  timeSlot: string;
  insuranceConcern: string;
  insuranceCompany: string;
  preferredLanguage: string;
  advisorId?: string;
  appointmentId?: string;
  docketNumber?: string;
}
