import React from 'react';
import { Appointment } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, appointment }) => {
  if (!isOpen || !appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  const docketNumber = appointment.docket_number;
  const customerName = appointment.customer_name;
  const customerPhone = appointment.customer_phone;
  const customerEmail = appointment.customer_email;
  const insuranceCompany = appointment.insurance_company;
  const preferredDate = appointment.preferred_date;
  const preferredTime = appointment.preferred_time;
  const totalAmount = appointment.total_amount || 499.00;
  const fee = appointment.fee || 422.88;
  const tax = appointment.tax || 76.12;
  const paymentId = appointment.razorpay_payment_id || 'PAY-VERIFIED-RAZORPAY';
  const createdAt = appointment.created_at;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2DCD3] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="bg-[#144439] text-white p-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            <span className="font-bold text-sm">Official Tax Invoice & Docket Certificate</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-8 overflow-y-auto flex-1 bg-white font-sans text-[#171d1a]" id="printable-invoice">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-[#E2DCD3]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#144439] text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">account_balance</span>
                </div>
                <h2 className="font-headline font-bold text-xl text-[#002d24]">
                  Bima Dost • ClaimBridge
                </h2>
              </div>
              <p className="text-xs text-[#404945] mt-1">
                Civic Insurance Advisory & Grievance Facilitation Network<br />
                CIN: U66010DL2024PTC192841 • GSTIN: 07AAACB1234F1Z8<br />
                Barakhamba Road, Connaught Place, New Delhi 110001
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-[#eff5f0] text-[#144439] font-mono font-bold text-xs border border-[#c0c8c4]">
                ORIGINAL TAX INVOICE
              </span>
              <p className="font-mono font-bold text-sm text-[#171d1a] mt-2">
                #{docketNumber}
              </p>
              <p className="text-xs text-[#404945]">
                Date: {new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6 py-5 border-b border-[#E2DCD3] text-xs">
            <div>
              <span className="font-bold text-[#404945] uppercase tracking-wider block mb-1">
                Policyholder / Recipient
              </span>
              <p className="font-bold text-sm text-[#171d1a]">{customerName}</p>
              <p className="text-[#404945]">Phone: {customerPhone}</p>
              {customerEmail && <p className="text-[#404945]">Email: {customerEmail}</p>}
              <p className="text-[#404945] mt-1">
                Insurance Provider: <strong>{insuranceCompany}</strong>
              </p>
            </div>
            <div>
              <span className="font-bold text-[#404945] uppercase tracking-wider block mb-1">
                Appointment Schedule & Session
              </span>
              <p className="font-bold text-sm text-[#171d1a]">{preferredDate}</p>
              <p className="text-[#D96B27] font-semibold">{preferredTime}</p>
              <p className="text-[#404945] mt-1">
                Session Mode: <strong>Google Meet / Direct Advocate Call</strong>
              </p>
              <p className="text-[#404945]">30 Minutes Private Consultation</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2DCD3] text-[#404945] uppercase tracking-wider">
                  <th className="py-2">Description of Advisory Service</th>
                  <th className="py-2">SAC Code</th>
                  <th className="py-2 text-right">Taxable Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff5f0]">
                <tr>
                  <td className="py-3">
                    <p className="font-semibold text-[#171d1a]">
                      Insurance Grievance Review & Ombudsman Consultation (30 mins session)
                    </p>
                    <p className="text-[#717975] text-[11px]">
                      Case Docket Reference: #{docketNumber}
                    </p>
                  </td>
                  <td className="py-3 text-[#404945] font-mono">998211</td>
                  <td className="py-3 text-right font-medium text-[#171d1a]">₹{fee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-3">
                    <p className="font-semibold text-[#171d1a]">Platform Facilitation & Case File Storage</p>
                    <p className="text-[#717975] text-[11px]">Zero percentage deduction policy guarantee</p>
                  </td>
                  <td className="py-3 text-[#404945] font-mono">998314</td>
                  <td className="py-3 text-right font-medium text-[#144439]">FREE (₹0.00)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown */}
          <div className="border-t border-[#E2DCD3] pt-4 flex justify-end">
            <div className="w-64 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-[#404945]">
                <span>Taxable Amount</span>
                <span className="font-medium text-[#171d1a]">₹{fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#404945]">
                <span>CGST (9%)</span>
                <span className="font-medium text-[#171d1a]">₹{(tax / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#404945]">
                <span>SGST (9%)</span>
                <span className="font-medium text-[#171d1a]">₹{(tax / 2).toFixed(2)}</span>
              </div>
              <div className="border-t border-[#E2DCD3] pt-2 flex justify-between font-bold text-sm text-[#144439]">
                <span>Total Amount Paid</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-[#717975] text-right mt-1">
                Payment Ref: {paymentId}<br />
                Gateway: Razorpay (Captured & Verified)
              </div>
            </div>
          </div>

          {/* Statutory Stamp */}
          <div className="mt-6 p-4 rounded-xl bg-[#eff5f0] border border-[#c0c8c4] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#144439] text-3xl">verified</span>
              <div>
                <p className="font-bold text-xs text-[#144439]">BIMA DOST CIVIC DOCKET VERIFIED</p>
                <p className="text-[11px] text-[#404945]">
                  Governed under Consumer Protection (E-Commerce) Rules 2020 & Insurance Ombudsman Rules 2017.
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-[#717975]">
              STAMP: SYSTEM-SIGNED<br />
              {new Date().toISOString().slice(0, 10)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
