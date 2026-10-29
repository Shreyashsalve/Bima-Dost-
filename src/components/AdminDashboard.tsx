import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface AdminDashboardProps {
  onBackToApp: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToApp }) => {
  const { admin, adminLogin, adminLogout, isAdminAuthenticated } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@bimadost.in');
  const [loginPassword, setLoginPassword] = useState('AdminPassword@2026');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Appointments data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [counts, setCounts] = useState<any>({
    total: 0,
    awaiting_approval: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    awaiting_payment: 0,
    cancelled_refunded: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Integration credentials status
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Selected appointment modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [googleMeetInput, setGoogleMeetInput] = useState('');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetryNotification = async (notifId: string) => {
    setRetryingId(notifId);
    try {
      await api.retryNotification(notifId);
      if (selectedAppointment) {
        await fetchNotificationLogs(selectedAppointment.id);
      }
    } catch (err: any) {
      alert('Retry failed: ' + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const fetchAppointments = async () => {
    if (!isAdminAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.getAdminAppointments({
        status: activeFilter === 'all' ? undefined : activeFilter,
        search: searchTerm || undefined
      });
      setAppointments(res.appointments);
      setCounts(res.counts);
    } catch (err: any) {
      console.error('Failed to fetch admin appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    if (!isAdminAuthenticated) return;
    try {
      const res = await api.getConfigStatus();
      setConfigStatus(res);
    } catch (err) {
      console.error('Failed to fetch config status:', err);
    }
  };

  const fetchNotificationLogs = async (appointmentId: string) => {
    setLoadingLogs(true);
    try {
      const res = await api.getAppointmentNotifications(appointmentId);
      setNotificationLogs(res.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAppointments();
      fetchConfig();
    }
  }, [isAdminAuthenticated, activeFilter, searchTerm]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await adminLogin(loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(err.message || 'Administrator authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOpenDetails = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setGoogleMeetInput(apt.google_meet_url || `https://meet.google.com/bmd-${Math.random().toString(36).substring(2, 7)}-${Math.random().toString(36).substring(2, 6)}`);
    setAdminNotesInput(apt.admin_notes || '');
    setRejectionReasonInput('');
    setShowRejectModal(false);
    setFeedbackMsg(null);
    fetchNotificationLogs(apt.id);
  };

  const handleApprove = async () => {
    if (!selectedAppointment) return;
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await api.approveAppointment(
        selectedAppointment.id,
        googleMeetInput,
        adminNotesInput
      ) as any;
      setSelectedAppointment(res.appointment);
      let text = res.message;
      if (res.calendarError) {
        text += ` (Calendar Note: ${res.calendarError}. Fallback Meet link generated.)`;
      }
      setFeedbackMsg({ type: 'success', text });
      await fetchAppointments();
      await fetchNotificationLogs(selectedAppointment.id);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAppointment) return;
    if (!rejectionReasonInput.trim()) {
      alert('Please state a reason for rejecting this consultation.');
      return;
    }
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await api.rejectAppointment(
        selectedAppointment.id,
        rejectionReasonInput,
        true
      );
      setSelectedAppointment(res.appointment);
      setShowRejectModal(false);
      setFeedbackMsg({ type: 'success', text: res.message });
      await fetchAppointments();
      await fetchNotificationLogs(selectedAppointment.id);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedAppointment) return;
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await api.completeAppointment(selectedAppointment.id);
      setSelectedAppointment(res.appointment);
      setFeedbackMsg({ type: 'success', text: res.message });
      await fetchAppointments();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'payment_verified_awaiting_approval':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#ffdbcb] text-[#692b00] border border-[#ff8843]/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D96B27] animate-pulse"></span>
            Awaiting Approval
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#bceddd] text-[#002019] border border-[#204f43]/40 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">verified</span>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a]/40">
            Rejected
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#dee4df] text-[#171d1a]">
            Completed
          </span>
        );
      case 'awaiting_payment':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#eff5f0] text-[#717975]">
            Awaiting Payment
          </span>
        );
      case 'cancelled_refunded':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#ffdad6] text-[#93000a]">
            Cancelled / Refunded
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100">{status}</span>;
    }
  };

  // If not logged in as Admin, show Admin Login Portal
  if (!isAdminAuthenticated) {
    return (
      <div className="w-full bg-[#f5fbf6] min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E2DCD3] overflow-hidden">
          <div className="bg-[#144439] text-white p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </div>
            <h1 className="font-headline font-bold text-xl">Bima Dost Administrator Portal</h1>
            <p className="text-xs text-[#82b1a2] mt-1">
              Protected Administrative Session • JWT Authentication
            </p>
          </div>

          <div className="p-6">
            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#93000a] text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-[#171d1a] mb-1">
                  Administrator Email / Username
                </label>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@bimadost.in"
                  className="w-full h-11 px-3.5 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171d1a] mb-1">
                  Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full h-11 mt-1 rounded-lg bg-[#144439] hover:bg-[#002d24] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">lock_open</span>
                    <span>Sign In to Admin Dashboard</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#E2DCD3] flex items-center justify-between text-xs text-[#404945]">
              <button
                onClick={onBackToApp}
                className="text-[#144439] hover:underline flex items-center gap-1 font-semibold"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to Public Portal
              </button>
              <span className="text-[11px] text-[#717975]">Rate-limited & Monitored</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f5fbf6] min-h-screen py-6">
      <div className="max-w-[1240px] mx-auto px-4 lg:px-6 flex flex-col gap-6">
        {/* Top Admin Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2DCD3] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#144439] text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline font-bold text-xl text-[#002d24]">
                  Bima Dost • Chief Grievance Administration
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#bceddd] text-[#002019] border border-[#204f43]/40">
                  JWT Session Active
                </span>
              </div>
              <p className="text-xs text-[#404945]">
                Logged in as <strong>{admin?.email}</strong> • Role: Administrator (Full Authority)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="px-3.5 py-2 rounded-lg bg-[#bceddd] hover:bg-[#a5e2d1] text-[#002019] text-xs font-bold transition-colors flex items-center gap-1.5 border border-[#204f43]/30 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">settings_input_component</span>
              <span>Integration Status</span>
              <span className={`w-2 h-2 rounded-full ${
                configStatus?.whatsapp?.configured && configStatus?.resend?.configured
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}></span>
            </button>
            <button
              onClick={onBackToApp}
              className="px-3.5 py-2 rounded-lg bg-[#eff5f0] hover:bg-[#e4eae5] text-[#144439] text-xs font-bold transition-colors flex items-center gap-1.5 border border-[#c0c8c4]/40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              <span>Public Website</span>
            </button>
            <button
              onClick={() => adminLogout()}
              className="px-3.5 py-2 rounded-lg bg-[#ffdad6] hover:bg-[#ffdad6]/80 text-[#93000a] text-xs font-bold transition-colors flex items-center gap-1.5 border border-[#ba1a1a]/30 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Integration Credentials & Health Diagnostic Panel */}
        {showConfigPanel && (
          <div className="bg-white rounded-2xl p-5 border border-[#E2DCD3] shadow-xs flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E2DCD3] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#144439] text-xl">hub</span>
                <div>
                  <h3 className="font-headline font-bold text-sm text-[#002d24]">
                    Server-Side Integrations & Service Credentials
                  </h3>
                  <p className="text-[11px] text-[#404945]">
                    Read directly from environment variables. If missing or invalid, exact diagnostic errors are logged and surfaced.
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchConfig()}
                className="px-2.5 py-1 text-[11px] font-bold text-[#144439] bg-[#eff5f0] hover:bg-[#e4eae5] rounded flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">refresh</span>
                Refresh Status
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* WhatsApp Cloud API */}
              <div className="p-3.5 rounded-xl border border-[#E2DCD3] bg-[#f5fbf6] flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#171d1a]">
                    <span className="material-symbols-outlined text-[#25D366] text-base">chat</span>
                    <span>WhatsApp Cloud API</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    configStatus?.whatsapp?.configured ? 'bg-[#bceddd] text-[#002019]' : 'bg-[#ffdad6] text-[#93000a]'
                  }`}>
                    {configStatus?.whatsapp?.configured ? 'Active' : 'Unconfigured'}
                  </span>
                </div>
                <p className="text-[11px] text-[#404945] leading-normal">
                  Meta Graph API v21.0 for instant customer WhatsApp dispatch on payment & confirmation.
                </p>
                <div className="pt-2 border-t border-[#E2DCD3] text-[10px] text-[#717975] font-mono">
                  {configStatus?.whatsapp?.configured ? (
                    <span className="text-emerald-700">Phone ID: {configStatus.whatsapp.phoneNumberId}</span>
                  ) : (
                    <span className="text-amber-800">Requires WHATSAPP_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID</span>
                  )}
                </div>
              </div>

              {/* Resend Email Provider */}
              <div className="p-3.5 rounded-xl border border-[#E2DCD3] bg-[#f5fbf6] flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#171d1a]">
                    <span className="material-symbols-outlined text-[#144439] text-base">mail</span>
                    <span>Resend Transactional</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    configStatus?.resend?.configured ? 'bg-[#bceddd] text-[#002019]' : 'bg-[#ffdad6] text-[#93000a]'
                  }`}>
                    {configStatus?.resend?.configured ? 'Active' : 'Unconfigured'}
                  </span>
                </div>
                <p className="text-[11px] text-[#404945] leading-normal">
                  Transactional email delivery for admin action alerts & customer calendar invites.
                </p>
                <div className="pt-2 border-t border-[#E2DCD3] text-[10px] text-[#717975] font-mono">
                  {configStatus?.resend?.configured ? (
                    <span className="text-emerald-700">From: {configStatus.resend.fromAddress}</span>
                  ) : (
                    <span className="text-amber-800">Requires RESEND_API_KEY in .env</span>
                  )}
                </div>
              </div>

              {/* Google Calendar & Meet */}
              <div className="p-3.5 rounded-xl border border-[#E2DCD3] bg-[#f5fbf6] flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#171d1a]">
                    <span className="material-symbols-outlined text-[#144439] text-base">calendar_month</span>
                    <span>Google Calendar & Meet</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    configStatus?.googleCalendar?.configured ? 'bg-[#bceddd] text-[#002019]' : 'bg-[#ffdbcb] text-[#692b00]'
                  }`}>
                    {configStatus?.googleCalendar?.configured ? 'Active' : 'Fallback Meet'}
                  </span>
                </div>
                <p className="text-[11px] text-[#404945] leading-normal">
                  Creates calendar event with official Google Meet video conference link for each consultation.
                </p>
                <div className="pt-2 border-t border-[#E2DCD3] text-[10px] text-[#717975] font-mono">
                  {configStatus?.googleCalendar?.configured ? (
                    <span className="text-emerald-700">Calendar: {configStatus.googleCalendar.calendarId}</span>
                  ) : (
                    <span className="text-amber-800">Uses fallback Meet URLs until Service Account is set</span>
                  )}
                </div>
              </div>

              {/* Razorpay Gateway */}
              <div className="p-3.5 rounded-xl border border-[#E2DCD3] bg-[#f5fbf6] flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#171d1a]">
                    <span className="material-symbols-outlined text-[#0c2340] text-base">payments</span>
                    <span>Razorpay Gateway</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    configStatus?.razorpay?.configured ? 'bg-[#bceddd] text-[#002019]' : 'bg-[#bceddd] text-[#002019]'
                  }`}>
                    {configStatus?.razorpay?.configured ? 'Active' : 'Test Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-[#404945] leading-normal">
                  Server-side order generation, HMAC SHA256 signature verification, and idempotent webhooks.
                </p>
                <div className="pt-2 border-t border-[#E2DCD3] text-[10px] text-[#717975] font-mono truncate">
                  <span className="text-emerald-700">Key: {configStatus?.razorpay?.keyId || 'rzp_test_...'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E2DCD3] shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#717975] uppercase tracking-wider">Total Appointments</span>
            <span className="font-headline font-bold text-3xl text-[#002d24] mt-1">{counts.total}</span>
            <span className="text-[11px] text-[#404945] mt-2">All-time dockets logged in SQLite</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ff8843]/60 bg-[#ffdbcb]/20 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#D96B27] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">pending_actions</span>
              Awaiting Approval
            </span>
            <span className="font-headline font-bold text-3xl text-[#D96B27] mt-1">{counts.awaiting_approval}</span>
            <span className="text-[11px] text-[#692b00] mt-2 font-medium">Payment verified • Action required</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#bceddd] bg-[#bceddd]/20 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#144439] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">verified</span>
              Approved
            </span>
            <span className="font-headline font-bold text-3xl text-[#144439] mt-1">{counts.approved}</span>
            <span className="text-[11px] text-[#002019] mt-2 font-medium">Google Meet link assigned</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2DCD3] shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#717975] uppercase tracking-wider">Completed Sessions</span>
            <span className="font-headline font-bold text-3xl text-[#171d1a] mt-1">{counts.completed}</span>
            <span className="text-[11px] text-[#404945] mt-2">{counts.rejected} rejected / refunded</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2DCD3] shadow-xs flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: `All (${counts.total})` },
                { id: 'payment_verified_awaiting_approval', label: `Awaiting Approval (${counts.awaiting_approval})` },
                { id: 'approved', label: `Approved (${counts.approved})` },
                { id: 'rejected', label: `Rejected (${counts.rejected})` },
                { id: 'completed', label: `Completed (${counts.completed})` },
                { id: 'awaiting_payment', label: `Awaiting Payment (${counts.awaiting_payment})` },
                { id: 'cancelled_refunded', label: `Refunded (${counts.cancelled_refunded})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-[#144439] text-white shadow-xs'
                      : 'bg-[#eff5f0] text-[#404945] hover:bg-[#e4eae5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, email, docket..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#eff5f0] text-xs text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#717975] text-base">search</span>
            </div>
          </div>

          {/* Appointments Table */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#404945]">
              <span className="material-symbols-outlined animate-spin text-2xl text-[#144439] mb-2">progress_activity</span>
              <p>Querying appointments from SQLite database...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#404945] flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-[#717975]">inbox</span>
              <p className="font-semibold text-sm text-[#171d1a]">No appointments match the selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2DCD3] text-[#717975] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Docket / Date</th>
                    <th className="py-3 px-3">Customer Information</th>
                    <th className="py-3 px-3">Insurance Concern</th>
                    <th className="py-3 px-3">Payment Status</th>
                    <th className="py-3 px-3">Booking Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff5f0]">
                  {appointments.map(apt => (
                    <tr key={apt.id} className="hover:bg-[#f5fbf6] transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-xs text-[#144439] block">
                          #{apt.docket_number}
                        </span>
                        <span className="text-[11px] text-[#171d1a] block font-semibold mt-0.5">
                          {apt.preferred_date}
                        </span>
                        <span className="text-[10px] text-[#717975]">{apt.preferred_time}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[#171d1a] text-xs block">{apt.customer_name}</span>
                        <span className="text-[11px] text-[#404945] block">{apt.customer_phone}</span>
                        <span className="text-[11px] text-[#717975] block truncate max-w-[180px]">{apt.customer_email}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-[#171d1a] block truncate max-w-[220px]">
                          {apt.insurance_company || 'Insurer'}
                        </span>
                        <p className="text-[11px] text-[#404945] truncate max-w-[220px]">
                          {apt.insurance_concern}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          apt.payment_status === 'verified'
                            ? 'bg-[#bceddd] text-[#002019]'
                            : apt.payment_status === 'refunded'
                            ? 'bg-[#ffdad6] text-[#93000a]'
                            : 'bg-[#eff5f0] text-[#717975]'
                        }`}>
                          {apt.payment_status}
                        </span>
                        <span className="text-[10px] font-mono text-[#717975] block mt-0.5">
                          ₹{apt.total_amount.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {getStatusBadge(apt.status)}
                        {apt.google_meet_url && (
                          <span className="text-[10px] text-[#144439] font-semibold flex items-center gap-0.5 mt-1">
                            <span className="material-symbols-outlined text-[12px]">video_camera_front</span>
                            Meet Linked
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(apt)}
                          className="px-3 py-1.5 rounded-lg bg-[#144439] hover:bg-[#002d24] text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          Review & Action →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail & Action Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2DCD3] overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#144439] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl">docket</span>
                <div>
                  <h3 className="font-headline font-bold text-base">
                    Appointment #{selectedAppointment.docket_number}
                  </h3>
                  <p className="text-xs text-[#82b1a2]">Administrative Review & Approval Console</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {feedbackMsg && (
                <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-[#bceddd] text-[#002019] border border-[#204f43]/40'
                    : 'bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a]/40'
                }`}>
                  <span className="material-symbols-outlined text-base">
                    {feedbackMsg.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* Status Header */}
              <div className="p-4 rounded-xl bg-[#eff5f0] border border-[#c0c8c4]/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#717975] uppercase tracking-wider block">Current Status</span>
                  <div className="mt-1">{getStatusBadge(selectedAppointment.status)}</div>
                </div>
                <div className="text-right text-xs">
                  <span className="text-[#717975] block">Payment Status</span>
                  <span className="font-bold text-[#144439] uppercase">{selectedAppointment.payment_status}</span>
                </div>
              </div>

              {/* Customer & Policy Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-[#E2DCD3]">
                  <span className="text-[#717975] font-semibold block mb-1">Customer Particulars</span>
                  <p className="font-bold text-sm text-[#171d1a]">{selectedAppointment.customer_name}</p>
                  <p className="text-[#404945]">{selectedAppointment.customer_phone}</p>
                  <p className="text-[#404945]">{selectedAppointment.customer_email}</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E2DCD3]">
                  <span className="text-[#717975] font-semibold block mb-1">Requested Slot</span>
                  <p className="font-bold text-sm text-[#171d1a]">{selectedAppointment.preferred_date}</p>
                  <p className="text-[#D96B27] font-semibold">{selectedAppointment.preferred_time}</p>
                  <p className="text-[#404945]">Language: {selectedAppointment.preferred_language}</p>
                </div>
              </div>

              {/* Insurance Concern */}
              <div className="p-3 bg-white rounded-xl border border-[#E2DCD3] text-xs">
                <span className="text-[#717975] font-semibold block mb-1">
                  Insurance Company & Grievance Concern
                </span>
                <p className="font-bold text-sm text-[#002d24]">{selectedAppointment.insurance_company}</p>
                <p className="text-[#404945] mt-1 leading-relaxed bg-[#f5fbf6] p-2.5 rounded-lg border border-[#E2DCD3]">
                  {selectedAppointment.insurance_concern}
                </p>
              </div>

              {/* Payment Details */}
              <div className="p-3 bg-white rounded-xl border border-[#E2DCD3] text-xs flex flex-col gap-1">
                <span className="text-[#717975] font-semibold block">Razorpay Transaction Context</span>
                <div className="flex justify-between">
                  <span>Razorpay Order ID:</span>
                  <span className="font-mono text-[#144439]">{selectedAppointment.razorpay_order_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Razorpay Payment ID:</span>
                  <span className="font-mono text-[#144439]">{selectedAppointment.razorpay_payment_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Fee (with 18% GST):</span>
                  <span className="font-bold text-[#171d1a]">₹{selectedAppointment.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Notification Status & Audit Trail */}
              <div className="p-3 bg-white rounded-xl border border-[#E2DCD3] flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between border-b border-[#eff5f0] pb-2">
                  <span className="font-bold text-[#171d1a] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#144439]">notifications_active</span>
                    Notification Delivery Logs & Audit Trail
                  </span>
                  <span className="font-mono font-bold text-[#144439] uppercase text-[11px] px-2 py-0.5 rounded bg-[#eff5f0]">
                    {selectedAppointment.notification_status}
                  </span>
                </div>

                {loadingLogs ? (
                  <div className="py-3 text-center text-xs text-[#717975] flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Loading delivery audit log from database...</span>
                  </div>
                ) : notificationLogs.length === 0 ? (
                  <div className="py-2 text-xs text-[#717975] italic">
                    No notification events recorded yet for this appointment.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {notificationLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${
                          log.status === 'sent'
                            ? 'bg-[#f5fbf6] border-[#bceddd]'
                            : log.status === 'skipped'
                            ? 'bg-[#f8faf8] border-[#c0c8c4]/60'
                            : 'bg-[#fff8f6] border-[#ffdad6]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              log.channel === 'whatsapp' ? 'bg-[#25D366]/20 text-[#075e54]' : 'bg-[#144439]/15 text-[#144439]'
                            }`}>
                              {log.channel}
                            </span>
                            <span className="text-[#171d1a] capitalize">{log.workflow.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'sent'
                                ? 'bg-[#bceddd] text-[#002019]'
                                : log.status === 'skipped'
                                ? 'bg-[#eff5f0] text-[#717975] border border-[#c0c8c4]'
                                : 'bg-[#ffdad6] text-[#93000a]'
                            }`}>
                              {log.status === 'skipped' ? 'Skipped (Optional)' : log.status}
                            </span>
                            {log.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handleRetryNotification(log.id)}
                                disabled={retryingId === log.id}
                                className="px-2 py-0.5 bg-[#144439] hover:bg-[#002d24] text-white rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[11px]">refresh</span>
                                <span>{retryingId === log.id ? 'Retrying...' : 'Retry'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px] text-[#717975]">
                          <span>Recipient: <strong className="text-[#171d1a]">{log.recipient}</strong></span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        {log.subject && (
                          <div className="text-[11px] font-semibold text-[#404945]">Subject: {log.subject}</div>
                        )}
                        {log.error_details && (
                          <div className={`mt-1 p-1.5 rounded text-[10px] font-mono border ${
                            log.status === 'skipped'
                              ? 'bg-white text-[#717975] border-[#c0c8c4]'
                              : 'bg-white text-[#ba1a1a] border-[#ffdad6]'
                          }`}>
                            {log.status === 'skipped' ? 'ℹ️ ' : '⚠️ '}
                            {log.error_details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Meet Link Display / Generation */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-[#171d1a] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-[#144439]">video_camera_front</span>
                  Google Meet Consultation Link (Generated for Advocate & Policyholder)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={googleMeetInput}
                    onChange={(e) => setGoogleMeetInput(e.target.value)}
                    placeholder="https://meet.google.com/bmd-xxx-yyy"
                    className="flex-1 h-10 px-3 rounded-lg bg-[#eff5f0] text-xs font-mono text-[#171d1a] border border-[#E2DCD3]"
                  />
                  {selectedAppointment.google_meet_url && (
                    <a
                      href={selectedAppointment.google_meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 h-10 bg-[#144439] text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-[#002d24]"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      Test Meet
                    </a>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-[#171d1a]">Administrative Advocate Assignment Notes</label>
                <input
                  type="text"
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  placeholder="e.g. Assigned to Advocate Rajesh Sharma (Delhi Bar)"
                  className="w-full h-10 px-3 rounded-lg bg-[#eff5f0] text-xs text-[#171d1a] border border-[#E2DCD3]"
                />
              </div>

              {/* Rejection Prompt if rejecting */}
              {showRejectModal && (
                <div className="p-4 rounded-xl bg-[#ffdad6]/50 border border-[#ba1a1a]/40 flex flex-col gap-2 text-xs animate-in fade-in">
                  <span className="font-bold text-[#93000a]">Specify Rejection & Refund Ground</span>
                  <textarea
                    rows={2}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="State reason for rejecting appointment request..."
                    className="w-full p-2.5 rounded-lg bg-white border border-[#ba1a1a]/40 text-xs"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(false)}
                      className="px-3 py-1.5 rounded bg-white text-xs text-[#404945]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleReject}
                      className="px-3 py-1.5 rounded bg-[#ba1a1a] text-white text-xs font-bold"
                    >
                      Confirm Rejection & Initiate Refund
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#eff5f0] border-t border-[#E2DCD3] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {selectedAppointment.status !== 'rejected' && selectedAppointment.status !== 'completed' && !showRejectModal && (
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-3 py-2 rounded-lg bg-white border border-[#ba1a1a]/40 text-[#ba1a1a] hover:bg-[#ffdad6] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reject Appointment
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedAppointment.status === 'approved' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleComplete}
                    className="px-4 py-2 rounded-lg bg-[#eff5f0] hover:bg-[#e4eae5] text-[#144439] text-xs font-bold border border-[#E2DCD3] transition-colors cursor-pointer"
                  >
                    Mark as Completed
                  </button>
                )}

                {selectedAppointment.status !== 'approved' && selectedAppointment.status !== 'completed' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleApprove}
                    className="px-5 py-2 rounded-lg bg-[#144439] hover:bg-[#002d24] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {actionLoading ? 'Processing Approval...' : 'Approve Appointment & Dispatch Meet'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
