import React, { useState } from 'react';
import { Appointment } from '../types';
import { api } from '../services/api';

interface AppointmentTrackerProps {
  initialDocket?: string;
  onOpenReceipt: (apt: Appointment) => void;
  onClose: () => void;
}

export const AppointmentTracker: React.FC<AppointmentTrackerProps> = ({
  initialDocket = '',
  onOpenReceipt,
  onClose
}) => {
  const [docketInput, setDocketInput] = useState(initialDocket);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docketInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.trackAppointment(docketInput.trim());
      setAppointment(res.appointment);
    } catch (err: any) {
      setError(err.message || 'Docket reference not found.');
      setAppointment(null);
    } finally {
      setLoading(false);
    }
  };

  const getStepActiveIndex = (status: string) => {
    switch (status) {
      case 'awaiting_payment':
        return 0;
      case 'payment_verified_awaiting_approval':
        return 1;
      case 'approved':
        return 2;
      case 'completed':
        return 3;
      case 'rejected':
      case 'cancelled_refunded':
        return -1;
      default:
        return 1;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E2DCD3] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#144439] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">track_changes</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base">
                Docket Status Live Tracker
              </h3>
              <p className="text-xs text-[#82b1a2]">Bima Dost Civic Grievance System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Lookup Input Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={docketInput}
                onChange={(e) => setDocketInput(e.target.value)}
                placeholder="Enter Docket #BD-2026-XXXXX or Appointment ID"
                className="w-full h-11 pl-9 pr-3.5 rounded-lg bg-[#eff5f0] text-xs font-mono text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#717975] text-base">search</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 bg-[#144439] hover:bg-[#002d24] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {loading ? 'Searching...' : 'Track Docket'}
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#93000a] text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {appointment && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              {/* Docket Status Card */}
              <div className="p-4 rounded-xl bg-[#eff5f0] border border-[#E2DCD3] flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-sm text-[#002d24]">
                    #{appointment.docket_number}
                  </span>
                  <p className="text-xs text-[#404945] mt-0.5">
                    Customer: <strong>{appointment.customer_name}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    appointment.status === 'approved'
                      ? 'bg-[#bceddd] text-[#002019]'
                      : appointment.status === 'payment_verified_awaiting_approval'
                      ? 'bg-[#ffdbcb] text-[#692b00]'
                      : appointment.status === 'rejected'
                      ? 'bg-[#ffdad6] text-[#93000a]'
                      : 'bg-white text-[#171d1a]'
                  }`}>
                    {appointment.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* State Machine Step Pipeline */}
              {appointment.status !== 'rejected' && appointment.status !== 'cancelled_refunded' ? (
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  {[
                    { label: 'Payment', num: 1 },
                    { label: 'Awaiting Approval', num: 2 },
                    { label: 'Approved', num: 3 },
                    { label: 'Completed', num: 4 }
                  ].map((step, idx) => {
                    const activeIdx = getStepActiveIndex(appointment.status);
                    const isDone = idx < activeIdx;
                    const isCurrent = idx === activeIdx;

                    return (
                      <div
                        key={step.num}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${
                          isCurrent
                            ? 'bg-[#D96B27] text-white border-[#D96B27] font-bold'
                            : isDone
                            ? 'bg-[#bceddd] text-[#002019] border-[#204f43]/30 font-semibold'
                            : 'bg-[#eff5f0] text-[#717975] border-[#E2DCD3]'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center font-bold text-[9px]">
                          {isDone ? '✓' : step.num}
                        </span>
                        <span className="truncate w-full">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-[#ffdad6] rounded-xl text-xs text-[#93000a] border border-[#ba1a1a]/40">
                  <strong>Rejection Note:</strong> {appointment.rejection_reason || 'Administrative repudiation.'}
                  <p className="text-[11px] mt-1 text-[#404945]">100% refund initiated to your payment source.</p>
                </div>
              )}

              {/* Appointment Approved Google Meet Link */}
              {appointment.status === 'approved' && appointment.google_meet_url && (
                <div className="p-4 rounded-xl bg-[#bceddd] border border-[#204f43]/40 flex flex-col gap-2 text-xs text-[#002019]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">video_camera_front</span>
                    <strong className="text-sm">Consultation Approved • Google Meet Ready</strong>
                  </div>
                  <p>
                    Your session is scheduled for <strong>{appointment.preferred_date}</strong> at <strong>{appointment.preferred_time}</strong>.
                  </p>
                  <a
                    href={appointment.google_meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-[#144439] hover:bg-[#002d24] text-white font-bold text-xs mt-1 transition-colors"
                  >
                    <span>Join Google Meet Consultation</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>
              )}

              {/* Status Explanation */}
              {appointment.status === 'payment_verified_awaiting_approval' && (
                <div className="p-3 rounded-xl bg-[#ffdbcb]/40 border border-[#ff8843]/40 text-xs text-[#692b00]">
                  <strong>Awaiting Administrative Review:</strong> Your payment of ₹499 has been verified. The Chief Grievance Officer is currently reviewing your insurance concern to assign the appropriate claims advocate. You will receive an SMS and WhatsApp notification once approved.
                </div>
              )}

              {/* Details table */}
              <div className="bg-white p-3 rounded-xl border border-[#E2DCD3] text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-[#404945]">Insurance Provider:</span>
                  <span className="font-semibold text-[#171d1a]">{appointment.insurance_company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#404945]">Scheduled Date & Time:</span>
                  <span className="font-semibold text-[#171d1a]">{appointment.preferred_date} • {appointment.preferred_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#404945]">Payment Reference:</span>
                  <span className="font-mono text-[#144439]">{appointment.razorpay_payment_id || 'pay_verified'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenReceipt(appointment)}
                className="w-full py-2.5 px-4 rounded-lg bg-[#eff5f0] hover:bg-[#e4eae5] text-[#144439] text-xs font-bold border border-[#E2DCD3] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                <span>Download Official Tax Invoice (PDF)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
