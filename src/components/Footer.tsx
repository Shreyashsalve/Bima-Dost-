import React from 'react';
import { Language } from '../types';

interface FooterProps {
  language: Language;
  onNavigate: (view: string) => void;
  onOpenCalculator: () => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigate, onOpenCalculator }) => {
  return (
    <footer className="w-full bg-[#e9efea] border-t border-[#E2DCD3] pt-12 pb-8 text-[#171d1a]">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-[#c0c8c4]/60">
          {/* Brand Col */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#144439] text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-lg">account_balance</span>
              </div>
              <span className="font-headline font-bold text-lg text-[#002d24]">
                ClaimBridge • Bima Dost
              </span>
            </div>
            <p className="text-sm text-[#404945] leading-relaxed">
              India's dedicated civic insurance consultation and claim recovery advisory network. We defend policyholders through verified ex-claims officers and legal counsels.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-[#144439]">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>100% Independent • Zero Claim Commissions</span>
            </div>
          </div>

          {/* Core Services */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline font-bold text-sm text-[#002d24] uppercase tracking-wider">
              Dispute Redressal
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-[#404945]">
              <li>
                <button onClick={() => onNavigate('schedule')} className="hover:text-[#144439] text-left hover:underline">
                  Health Claim Rejections (Section 45)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('schedule')} className="hover:text-[#144439] text-left hover:underline">
                  Room Rent & Proportionate Deductions
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('schedule')} className="hover:text-[#144439] text-left hover:underline">
                  Cashless Approval Delays (&gt;15 Days)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('schedule')} className="hover:text-[#144439] text-left hover:underline">
                  Motor Total Loss & Salvage Dispute
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('schedule')} className="hover:text-[#144439] text-left hover:underline">
                  Insurance Ombudsman Representation
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Tools & Legal Guides */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline font-bold text-sm text-[#002d24] uppercase tracking-wider">
              Civic Utilities & Guides
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-[#404945]">
              <li>
                <button onClick={onOpenCalculator} className="hover:text-[#D96B27] font-semibold text-left flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">calculate</span>
                  Ombudsman Merit Calculator
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#144439] text-left hover:underline">
                  IRDAI Grievance Timeline Guide
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#144439] text-left hover:underline">
                  Ombudsman Regulations 2017 Rules
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#144439] text-left hover:underline">
                  Pre-Existing Disease (PED) Burden of Proof
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('schedule')} className="hover:text-[#144439] text-left hover:underline">
                  Fixed ₹499 Session Protocol
                </button>
              </li>
            </ul>
          </div>

          {/* Statutory Grievance Helpline */}
          <div className="flex flex-col gap-3 bg-[#eff5f0] p-4 rounded-xl border border-[#c0c8c4]/60">
            <span className="text-xs font-bold text-[#D96B27] uppercase tracking-wider">
              Direct Helpline
            </span>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#144439] text-2xl">call</span>
              <div>
                <p className="font-bold text-base text-[#144439]">1800-209-CLAIM</p>
                <p className="text-xs text-[#404945]">Toll-Free All India (9 AM - 8 PM IST)</p>
              </div>
            </div>
            <p className="text-xs text-[#404945] leading-normal pt-1">
              WhatsApp Support: +91 98201 43890<br />
              Email: grievances@bimadost.in
            </p>
            <div className="pt-2 border-t border-[#c0c8c4]/40 text-[11px] text-[#717975]">
              Physical Address: Civic Advisory Tower, Barakhamba Road, New Delhi 110001
            </div>
          </div>
        </div>

        {/* Legal & Statutory Disclaimer */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#717975]">
          <p className="max-w-3xl leading-relaxed">
            Statutory Disclaimer: Bima Dost / ClaimBridge is an independent fee-only advisory platform connecting policyholders with certified insurance legal consultants and former claims advocates. We are not an insurance company, corporate broker, or TPA. Consultations follow the guidelines of the Insurance Ombudsman Rules 2017 and Consumer Protection Act 2019.
          </p>
          <div className="flex items-center gap-4 shrink-0 font-medium">
            <span>© 2026 ClaimBridge</span>
            <span>•</span>
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Advisory</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
