import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Advisor, Appointment, BookingFormState, Language } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeLanding } from './components/HomeLanding';
import { ScheduleStep } from './components/ScheduleStep';
import { DetailsStep } from './components/DetailsStep';
import { PaymentStep } from './components/PaymentStep';
import { AdminDashboard } from './components/AdminDashboard';
import { ClaimCalculatorModal } from './components/ClaimCalculatorModal';
import { ReceiptModal } from './components/ReceiptModal';
import { AppointmentTracker } from './components/AppointmentTracker';
import { ChatbotWidget } from './components/ChatbotWidget';

function MainApp() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [language, setLanguage] = useState<Language>('en');

  // Modals
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerDocket, setTrackerDocket] = useState<string>('');
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceiptAppointment, setActiveReceiptAppointment] = useState<Appointment | null>(null);

  // Advisors
  const [advisors, setAdvisors] = useState<Advisor[]>([]);

  // Booking session state
  const [booking, setBooking] = useState<BookingFormState>({
    fullName: 'Ramesh Kumar Patel',
    phone: '9820143890',
    email: 'ramesh.patel92@gmail.com',
    date: '2026-10-30',
    timeSlot: '11:15 AM IST',
    insuranceCompany: 'Star Health & Allied Insurance',
    preferredLanguage: 'English',
    insuranceConcern: 'Claim denied citing pre-existing hypertension condition. Patient was diagnosed only 14 months after policy bond issuance.',
    advisorId: 'adv_1'
  });

  // Razorpay order state returned from backend initiate booking
  const [activeRazorpayOrder, setActiveRazorpayOrder] = useState<{
    id: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [activeDocketNumber, setActiveDocketNumber] = useState<string | null>(null);

  // Load advisors catalog
  useEffect(() => {
    async function fetchAdvisors() {
      try {
        const res = await api.getAdvisors();
        if (res.advisors?.length) {
          setAdvisors(res.advisors);
        }
      } catch (err) {
        console.warn('Could not fetch advisors list:', err);
      }
    }
    fetchAdvisors();
  }, []);

  const updateBooking = (fields: Partial<BookingFormState>) => {
    setBooking(prev => ({ ...prev, ...fields }));
  };

  const handleSelectProblem = (problem: string) => {
    updateBooking({ insuranceConcern: `Grievance type: ${problem}. Insurer has denied or delayed payment.` });
    setCurrentView('schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAdvisor = (advId: string) => {
    updateBooking({ advisorId: advId });
    setCurrentView('schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInitiateSuccess = (data: {
    appointmentId: string;
    docketNumber: string;
    razorpayOrder: { id: string; amount: number; currency: string; keyId: string };
  }) => {
    setActiveAppointmentId(data.appointmentId);
    setActiveDocketNumber(data.docketNumber);
    setActiveRazorpayOrder(data.razorpayOrder);
    setCurrentView('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReceipt = (appointment: Appointment) => {
    setActiveReceiptAppointment(appointment);
    setReceiptOpen(true);
  };

  const handleOpenTrackerWithDocket = (docket: string) => {
    setTrackerDocket(docket);
    setTrackerOpen(true);
  };

  const handleClaimCalculatorProceed = (category: string, insurer: string, _amount: string) => {
    updateBooking({
      insuranceConcern: `Grievance under ${category} for ${insurer}. Disputed claim requiring Ombudsman representation roadmap.`,
      insuranceCompany: insurer
    });
    setCurrentView('schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5fbf6] text-[#171d1a]">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        language={language}
        onLanguageChange={setLanguage}
        onOpenTracker={() => {
          setTrackerDocket('');
          setTrackerOpen(true);
        }}
        onOpenCalculator={() => setCalculatorOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full pt-[96px]">
        {currentView === 'home' && (
          <HomeLanding
            language={language}
            advisors={advisors}
            onSelectProblem={handleSelectProblem}
            onSelectAdvisor={handleSelectAdvisor}
            onOpenCalculator={() => setCalculatorOpen(true)}
            onStartBooking={() => {
              setCurrentView('schedule');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'schedule' && (
          <ScheduleStep
            advisors={advisors}
            booking={booking}
            onUpdateBooking={updateBooking}
            onNext={() => {
              setCurrentView('details');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBack={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'details' && (
          <DetailsStep
            advisors={advisors}
            booking={booking}
            onUpdateBooking={updateBooking}
            onInitiateSuccess={handleInitiateSuccess}
            onBack={() => {
              setCurrentView('schedule');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'payment' && (
          <PaymentStep
            advisors={advisors}
            booking={booking}
            razorpayOrder={activeRazorpayOrder}
            appointmentId={activeAppointmentId}
            docketNumber={activeDocketNumber}
            onPaymentVerified={(apt) => {
              setActiveReceiptAppointment(apt);
            }}
            onOpenReceipt={handleOpenReceipt}
            onBackToDetails={() => {
              setCurrentView('details');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onTrackAppointment={handleOpenTrackerWithDocket}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            onBackToApp={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        language={language}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCalculator={() => setCalculatorOpen(true)}
      />

      {/* Modals */}
      <ClaimCalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onProceedToBook={handleClaimCalculatorProceed}
      />

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        appointment={activeReceiptAppointment}
      />

      {trackerOpen && (
        <AppointmentTracker
          initialDocket={trackerDocket}
          onOpenReceipt={handleOpenReceipt}
          onClose={() => setTrackerOpen(false)}
        />
      )}

      {/* Multilingual Gemini AI Chatbot (Requirement 8) */}
      <ChatbotWidget
        onOpenBooking={(prefillConcern?: string) => {
          if (prefillConcern) {
            updateBooking({ insuranceConcern: prefillConcern });
          }
          setCurrentView('schedule');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
