import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../types';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenTracker: () => void;
  onOpenCalculator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  language,
  onLanguageChange,
  onOpenTracker,
  onOpenCalculator
}) => {
  const { admin, adminLogout, isAdminAuthenticated } = useAuth();

  const labels = {
    en: {
      howItWorks: 'How It Works',
      whatWeCover: 'What We Cover',
      claimCheck: 'Claim Merit Check',
      advisors: 'Our Specialists',
      trackDocket: 'Track Docket',
      adminPortal: 'Admin Portal',
      bookConsultation: 'Book Consultation (₹499)',
      tollFree: 'Toll-free 1800-209-CLAIM',
      feeBanner: 'Transparent Consultation Fee: ₹499 per 30 mins • 100% Verified IRDAI-registered advisors'
    },
    hi: {
      howItWorks: 'प्रक्रिया कैसे काम करती है',
      whatWeCover: 'बीमा श्रेणियां',
      claimCheck: 'दावा पात्रता जांच',
      advisors: 'विशेषज्ञ सलाहकार',
      trackDocket: 'डॉकेट ट्रैक करें',
      adminPortal: 'व्यवस्थापक पोर्टल',
      bookConsultation: 'परामर्श बुक करें (₹499)',
      tollFree: 'टोल-फ्री 1800-209-CLAIM',
      feeBanner: 'पारदर्शी परामर्श शुल्क: ₹499 प्रति 30 मिनट • 100% सत्यापित IRDAI पंजीकृत सलाहकार'
    },
    mr: {
      howItWorks: 'कसे कार्य करते',
      whatWeCover: 'विमा प्रकार',
      claimCheck: 'दावा पात्रता चाचणी',
      advisors: 'तज्ज्ञ सल्लागार',
      trackDocket: 'डॉकेट ट्रॅक करा',
      adminPortal: 'प्रशासक पोर्टल',
      bookConsultation: 'सल्ला बुक करा (₹499)',
      tollFree: 'टोल-फ्री 1800-209-CLAIM',
      feeBanner: 'पारदर्शक सल्लागार शुल्क: ₹499 दर 30 मिनिटे • 100% सत्यापित IRDAI नोंदणीकृत सल्लागार'
    }
  }[language];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5fbf6]/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#E2DCD3]">
      {/* Top Notice Banner */}
      <div className="bg-[#144439] text-[#ffffff] px-4 py-1.5 text-center text-[12px] font-medium flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-sm text-[#bceddd]">verified_user</span>
        <span>{labels.feeBanner}</span>
        <span className="hidden md:inline text-[#82b1a2]">•</span>
        <span className="hidden md:inline font-semibold">{labels.tollFree}</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#144439] text-white flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">account_balance</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-lg text-[#002d24] leading-tight flex items-center gap-1.5">
                Bima Dost <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-[#eff5f0] text-[#144439] rounded border border-[#c0c8c4]">Civic</span>
              </span>
              <span className="text-[11px] text-[#404945] font-medium">ClaimBridge Advisory</span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'home' ? 'bg-[#e4eae5] text-[#171d1a] font-semibold' : 'text-[#404945] hover:text-[#171d1a] hover:bg-[#eff5f0]'
            }`}
          >
            {labels.howItWorks}
          </button>
          <button
            onClick={() => {
              onNavigate('home');
              setTimeout(() => document.getElementById('what-we-cover')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#404945] hover:text-[#171d1a] hover:bg-[#eff5f0] transition-colors"
          >
            {labels.whatWeCover}
          </button>
          <button
            onClick={onOpenCalculator}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#D96B27] hover:bg-[#ffdbcb]/30 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">analytics</span>
            {labels.claimCheck}
          </button>
          <button
            onClick={onOpenTracker}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#144439] hover:bg-[#eff5f0] transition-colors flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-base">track_changes</span>
            {labels.trackDocket}
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              currentView === 'admin'
                ? 'bg-[#144439] text-white font-semibold'
                : 'text-[#404945] hover:text-[#171d1a] hover:bg-[#eff5f0]'
            }`}
          >
            <span className="material-symbols-outlined text-base">shield_person</span>
            {labels.adminPortal}
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-[#e9efea] p-0.5 rounded-full border border-[#c0c8c4]/60">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                language === 'en' ? 'bg-[#002d24] text-white shadow-xs' : 'text-[#404945] hover:text-[#171d1a]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                language === 'hi' ? 'bg-[#002d24] text-white shadow-xs' : 'text-[#404945] hover:text-[#171d1a]'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => onLanguageChange('mr')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                language === 'mr' ? 'bg-[#002d24] text-white shadow-xs' : 'text-[#404945] hover:text-[#171d1a]'
              }`}
            >
              मराठी
            </button>
          </div>

          {/* Admin Logged In Badge / Action */}
          {isAdminAuthenticated && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#bceddd] text-[#002019] px-2.5 py-1 rounded-lg border border-[#204f43]/30 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>Admin: {admin?.username}</span>
              <button
                onClick={adminLogout}
                title="Log Out Admin"
                className="ml-1 text-[#002019] hover:text-[#ba1a1a]"
              >
                ×
              </button>
            </div>
          )}

          {/* Primary Book CTA */}
          <button
            onClick={() => onNavigate('schedule')}
            className="inline-flex items-center justify-center px-4 py-2 min-h-[42px] rounded-lg bg-[#D96B27] hover:bg-[#c25615] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base mr-1 hidden sm:inline">calendar_month</span>
            {labels.bookConsultation}
          </button>
        </div>
      </div>
    </header>
  );
};
