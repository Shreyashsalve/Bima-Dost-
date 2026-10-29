import React, { useState } from 'react';
import { Advisor, BookingFormState } from '../types';
import { api } from '../services/api';

interface DetailsStepProps {
  advisors: Advisor[];
  booking: BookingFormState;
  onUpdateBooking: (fields: Partial<BookingFormState>) => void;
  onInitiateSuccess: (data: {
    appointmentId: string;
    docketNumber: string;
    razorpayOrder: { id: string; amount: number; currency: string; keyId: string };
  }) => void;
  onBack: () => void;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  advisors,
  booking,
  onUpdateBooking,
  onInitiateSuccess,
  onBack
}) => {
  const [fullName, setFullName] = useState(booking.fullName || 'Ramesh Kumar Patel');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState(booking.phone || '9820143890');
  const [email, setEmail] = useState(booking.email || 'ramesh.patel92@gmail.com');
  const [language, setLanguage] = useState(booking.preferredLanguage || 'English');
  const [insuranceCompany, setInsuranceCompany] = useState(booking.insuranceCompany || 'Star Health & Allied Insurance');
  const [insuranceConcern, setInsuranceConcern] = useState(
    booking.insuranceConcern ||
    'Claim denied citing pre-existing hypertension condition. However, diagnosis occurred only after policy was active for 14 months.'
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentAdvisor = advisors.find(a => a.id === booking.advisorId) || advisors[0];

  const validateFrontend = (): boolean => {
    setValidationError(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setValidationError("Please enter customer's full name (at least 2 characters).");
      return false;
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setValidationError('Please enter a valid 10-digit mobile number.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setValidationError('Please enter a valid email address for receiving your docket & receipt.');
      return false;
    }

    if (!booking.date || !booking.timeSlot) {
      setValidationError('Preferred appointment date and time slot must be selected.');
      return false;
    }

    if (!insuranceConcern.trim() || insuranceConcern.trim().length < 10) {
      setValidationError('Please provide a brief description of your insurance concern (at least 10 characters).');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFrontend()) return;

    setIsSubmitting(true);
    setValidationError(null);

    const fullPhoneNumber = `${countryCode} ${phone.trim()}`;

    try {
      const formPayload: BookingFormState = {
        fullName: fullName.trim(),
        phone: fullPhoneNumber,
        email: email.trim().toLowerCase(),
        date: booking.date,
        timeSlot: booking.timeSlot,
        insuranceConcern: insuranceConcern.trim(),
        insuranceCompany: insuranceCompany.trim(),
        preferredLanguage: language,
        advisorId: currentAdvisor.id
      };

      onUpdateBooking(formPayload);

      // Call backend initiate booking API
      const res = await api.initiateBooking(formPayload);

      onInitiateSuccess({
        appointmentId: res.appointment.id,
        docketNumber: res.appointment.docketNumber,
        razorpayOrder: res.razorpayOrder
      });
    } catch (err: any) {
      setValidationError(err.message || 'Failed to initiate appointment booking. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#f5fbf6] min-h-screen pb-16">
      {/* Progress Stepper Header */}
      <section className="w-full bg-[#eff5f0] py-4 border-b border-[#E2DCD3]">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Step 1: Completed */}
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-xs border border-[#E2DCD3] hover:border-[#144439] transition-all text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#144439] text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">check</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-[#144439] uppercase tracking-wider">Step 1 • Confirmed</span>
                <span className="text-xs font-bold text-[#171d1a] truncate">Date & Time</span>
                <span className="text-[11px] text-[#404945] truncate">
                  {booking.date || '2026-10-30'} • {booking.timeSlot || '11:15 AM IST'}
                </span>
              </div>
            </button>

            {/* Step 2: Active */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ffdbcb]/60 border-2 border-[#D96B27] shadow-xs">
              <div className="w-9 h-9 rounded-full bg-[#D96B27] text-white font-bold text-sm flex items-center justify-center shrink-0">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-[#D96B27] uppercase tracking-wider">Step 2 • Active</span>
                <span className="text-xs font-bold text-[#341100] leading-tight">Appointment Booking Details</span>
                <span className="text-[11px] text-[#783100] truncate">Name, Contact & Concern</span>
              </div>
            </div>

            {/* Step 3: Upcoming */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#e9efea] opacity-80 border border-[#E2DCD3]">
              <div className="w-9 h-9 rounded-full bg-[#dee4df] text-[#404945] font-bold text-sm flex items-center justify-center shrink-0">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-medium text-[#717975] uppercase tracking-wider">Step 3 • Upcoming</span>
                <span className="text-xs font-medium text-[#404945] truncate">Razorpay Payment</span>
                <span className="text-[11px] text-[#717975] truncate">₹499.00 (All-inclusive)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form Interface */}
      <section className="w-full py-8">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
          {/* Breadcrumb & Slot Hold Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-[#144439] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Change Selected Slot ({booking.date || '2026-10-30'})
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff5f0] text-[#144439] text-xs font-semibold border border-[#c0c8c4]/40">
              <span className="material-symbols-outlined text-sm text-[#D96B27]">lock_clock</span>
              <span>Selected slot reserved • Proceed to secure payment</span>
            </div>
          </div>

          {/* Asymmetric 7:5 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#E2DCD3] shadow-xs">
                <h1 className="font-headline font-bold text-xl text-[#002d24]">
                  Appointment Booking & Insurance Concern
                </h1>
                <p className="text-xs text-[#404945] mt-1">
                  All fields are validated and stored securely in our database. We do not store sensitive payment card credentials.
                </p>
              </div>

              {validationError && (
                <div className="p-4 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#93000a] text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{validationError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-[#E2DCD3] shadow-xs flex flex-col gap-5">
                {/* 1. Customer's Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#171d1a]" htmlFor="customer-name">
                    Customer's Full Name <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="customer-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar Patel"
                      className="w-full h-12 px-3.5 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439] focus:bg-white"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-[#404945] text-lg">person</span>
                  </div>
                  <p className="text-[11px] text-[#404945]">
                    Enter your name as registered on your insurance policy document.
                  </p>
                </div>

                {/* 2. Mobile Number with Country Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#171d1a]" htmlFor="customer-phone">
                    Mobile Number with Country Code <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-12 px-3 bg-[#e9efea] rounded-lg text-xs font-bold text-[#171d1a] border border-[#c0c8c4]/60 focus:outline-none shrink-0"
                    >
                      <option value="+91">🇮🇳 +91 (India)</option>
                      <option value="+1">🇺🇸 +1 (US/Canada)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                      <option value="+65">🇸🇬 +65 (Singapore)</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        id="customer-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9820143890"
                        className="w-full h-12 px-3.5 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] font-medium tracking-wider border border-[#E2DCD3] focus:outline-none focus:border-[#144439] focus:bg-white"
                      />
                      <span className="material-symbols-outlined absolute right-3 top-3.5 text-[#144439] text-lg">call</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#404945]">
                    SMS and WhatsApp notifications will be sent to this phone number.
                  </p>
                </div>

                {/* 3. Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#171d1a]" htmlFor="customer-email">
                    Email Address <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="customer-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh.patel92@gmail.com"
                      className="w-full h-12 px-3.5 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439] focus:bg-white"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-[#404945] text-lg">mail</span>
                  </div>
                  <p className="text-[11px] text-[#404945]">
                    Used for sending your Razorpay payment receipt and Google Meet calendar invite.
                  </p>
                </div>

                {/* 4. Preferred Appointment Date & Time (Readonly summary from Step 1 with edit button) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#eff5f0] rounded-xl border border-[#c0c8c4]/40 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#717975] uppercase">Preferred Date</span>
                    <span className="font-bold text-sm text-[#171d1a]">{booking.date || '2026-10-30'}</span>
                  </div>
                  <div className="p-3 bg-[#eff5f0] rounded-xl border border-[#c0c8c4]/40 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#717975] uppercase">Preferred Time Slot</span>
                    <span className="font-bold text-sm text-[#D96B27]">{booking.timeSlot || '11:15 AM IST'}</span>
                  </div>
                </div>

                {/* 5. Insurance Company & Preferred Language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#171d1a] mb-1">
                      Insurance Company
                    </label>
                    <select
                      value={insuranceCompany}
                      onChange={(e) => setInsuranceCompany(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg bg-[#eff5f0] text-xs text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
                    >
                      <option value="Star Health & Allied Insurance">Star Health & Allied Insurance</option>
                      <option value="HDFC ERGO General Insurance">HDFC ERGO General Insurance</option>
                      <option value="Care Health Insurance">Care Health Insurance</option>
                      <option value="ICICI Lombard General">ICICI Lombard General</option>
                      <option value="Niva Bupa Health Insurance">Niva Bupa Health Insurance</option>
                      <option value="SBI General Insurance">SBI General Insurance</option>
                      <option value="Life Insurance Corporation (LIC)">Life Insurance Corporation (LIC)</option>
                      <option value="Tata AIG General Insurance">Tata AIG General Insurance</option>
                      <option value="Bajaj Allianz General">Bajaj Allianz General</option>
                      <option value="New India Assurance">New India Assurance</option>
                      <option value="Other Insurer">Other Insurer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#171d1a] mb-1">
                      Preferred Language for Consultation
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg bg-[#eff5f0] text-xs text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
                    >
                      <option value="English">English</option>
                      <option value="हिंदी (Hindi)">हिंदी (Hindi)</option>
                      <option value="मराठी (Marathi)">मराठी (Marathi)</option>
                    </select>
                  </div>
                </div>

                {/* 6. Brief Description of Insurance Concern */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#171d1a]" htmlFor="insurance-concern">
                    Brief Description of Insurance Concern <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <textarea
                    id="insurance-concern"
                    required
                    rows={4}
                    value={insuranceConcern}
                    onChange={(e) => setInsuranceConcern(e.target.value)}
                    placeholder="Describe your insurance claim issue (e.g. claim rejected citing pre-existing illness, deduction on room rent, delay in cashless discharge)..."
                    className="w-full p-3.5 rounded-lg bg-[#eff5f0] text-xs text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439] leading-relaxed"
                  />
                  <p className="text-[11px] text-[#717975]">
                    Minimum 10 characters. Our advocate reviews this before the session.
                  </p>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[50px] mt-2 rounded-lg bg-[#D96B27] hover:bg-[#c25615] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      <span>Creating Appointment & Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Razorpay Checkout (₹499.00)</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Reassurance (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-5 border border-[#E2DCD3] shadow-md flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#eff5f0]">
                  <span className="text-xs font-bold text-[#144439] uppercase tracking-wider">
                    Consultation Summary
                  </span>
                  <span className="text-[11px] font-bold text-[#D96B27] bg-[#ffdbcb]/30 px-2 py-0.5 rounded">
                    30 Mins Session
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#eff5f0] border border-[#c0c8c4]/40">
                  <img
                    src={currentAdvisor.avatar}
                    alt={currentAdvisor.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#002d24]">{currentAdvisor.name}</p>
                    <p className="text-[11px] text-[#404945]">{currentAdvisor.title}</p>
                    <p className="text-[10px] text-[#717975]">{currentAdvisor.barCouncilOrLicence}</p>
                  </div>
                </div>

                <div className="bg-[#f5fbf6] p-3 rounded-xl border border-[#E2DCD3] flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-[#404945]">
                    <span>Appointment Date:</span>
                    <strong className="text-[#171d1a]">{booking.date || '2026-10-30'}</strong>
                  </div>
                  <div className="flex justify-between text-[#404945]">
                    <span>Time Window:</span>
                    <strong className="text-[#D96B27]">{booking.timeSlot || '11:15 AM IST'}</strong>
                  </div>
                  <div className="flex justify-between text-[#404945]">
                    <span>Language:</span>
                    <strong className="text-[#144439]">{language}</strong>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-[#404945]">
                    <span>Consultation Tariff</span>
                    <span className="font-medium text-[#171d1a]">₹422.88</span>
                  </div>
                  <div className="flex justify-between text-[#404945]">
                    <span>Statutory GST (18%)</span>
                    <span className="font-medium text-[#171d1a]">₹76.12</span>
                  </div>
                  <div className="border-t border-[#E2DCD3] pt-2 flex justify-between font-bold text-sm text-[#002d24]">
                    <span>Total Consultation Fee</span>
                    <span className="font-headline text-lg">₹499.00</span>
                  </div>
                </div>

                <div className="p-3 bg-[#eff5f0] rounded-xl text-xs text-[#404945] flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm text-[#144439] shrink-0 mt-0.5">verified</span>
                  <span>
                    Zero Commission Guarantee: Bima Dost never takes any percentage or commission from your recovered claim settlement amount.
                  </span>
                </div>
              </div>

              {/* Data Protection Promise */}
              <div className="bg-[#eff5f0] p-4 rounded-xl border border-[#c0c8c4]/60 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#144439] text-xl shrink-0 mt-0.5">lock</span>
                <div className="text-xs text-[#404945]">
                  <strong className="text-[#171d1a] block mb-0.5">Privacy & Non-Disclosure</strong>
                  Customer phone, email, and case details are securely stored with appropriate constraints in our persistent database.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
