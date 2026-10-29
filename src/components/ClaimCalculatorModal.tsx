import React, { useState } from 'react';
import { api } from '../services/api';

interface ClaimCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToBook: (category: string, insurer: string, amount: string) => void;
}

export const ClaimCalculatorModal: React.FC<ClaimCalculatorModalProps> = ({
  isOpen,
  onClose,
  onProceedToBook
}) => {
  const [grievanceCategory, setGrievanceCategory] = useState('Claim Rejected');
  const [insurer, setInsurer] = useState('Star Health & Allied Insurance');
  const [claimAmount, setClaimAmount] = useState('₹2,50,000');
  const [reason, setReason] = useState('Rejected citing pre-existing condition (PED) not disclosed.');

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  if (!isOpen) return null;

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.analyzeClaim(grievanceCategory, insurer, claimAmount);
      setAnalysis(res.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E2DCD3] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#144439] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">analytics</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base">
                Ombudsman Merit Check & Claim Calculator
              </h3>
              <p className="text-xs text-[#82b1a2]">IRDAI Guidelines & Case Law Analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!analysis ? (
            <form onSubmit={handleCalculate} className="flex flex-col gap-4">
              <p className="text-xs text-[#404945]">
                Evaluate your probability of recovering your denied or deducted insurance claim through the Insurance Ombudsman or Consumer Commission before booking.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#171d1a] mb-1">
                  Claim Dispute Nature
                </label>
                <select
                  value={grievanceCategory}
                  onChange={(e) => setGrievanceCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
                >
                  <option value="Claim Rejected">Claim Rejected (PED / Non-Disclosure clause)</option>
                  <option value="Payment Less Than Expected">Excessive Deduction (Room Rent / Medical Consumables / Proportionate)</option>
                  <option value="Claim Delayed">Cashless / Reimbursement Settlement Delayed (&gt;15 days)</option>
                  <option value="Help Understanding Policy">Policy Coverage & Porting Rights Dispute</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171d1a] mb-1">
                  Insurance Provider
                </label>
                <select
                  value={insurer}
                  onChange={(e) => setInsurer(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
                >
                  <option value="Star Health & Allied Insurance">Star Health & Allied Insurance</option>
                  <option value="HDFC ERGO General Insurance">HDFC ERGO General Insurance</option>
                  <option value="Care Health Insurance">Care Health Insurance</option>
                  <option value="ICICI Lombard">ICICI Lombard</option>
                  <option value="Niva Bupa Health Insurance">Niva Bupa Health Insurance</option>
                  <option value="SBI General Insurance">SBI General Insurance</option>
                  <option value="Life Insurance Corporation (LIC)">Life Insurance Corporation (LIC)</option>
                  <option value="Tata AIG General Insurance">Tata AIG General Insurance</option>
                  <option value="Other Insurer">Other IRDAI Registered Insurer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#171d1a] mb-1">
                    Disputed Amount
                  </label>
                  <input
                    type="text"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="e.g. ₹2,50,000"
                    className="w-full h-11 px-3 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#171d1a] mb-1">
                    Insurer Repudiation Ground
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Non-disclosure / PED"
                    className="w-full h-11 px-3 rounded-lg bg-[#eff5f0] text-sm text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 rounded-lg bg-[#144439] hover:bg-[#002d24] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    <span>Analyzing Legal Precedents...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">calculate</span>
                    <span>Calculate Ombudsman Recovery Probability</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#eff5f0] border border-[#bceddd] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#404945] uppercase tracking-wider">
                    Ombudsman Merit Score
                  </span>
                  <div className="text-3xl font-extrabold text-[#144439] mt-0.5">
                    {analysis.ombudsmanSuccessRate} Favorability
                  </div>
                  <p className="text-xs text-[#144439] font-medium mt-1">
                    Strong basis for recovery under statutory Ombudsman rules.
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-[#144439] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {analysis.ombudsmanSuccessRate}
                </div>
              </div>

              <div className="bg-[#ffffff] p-4 rounded-xl border border-[#E2DCD3] flex flex-col gap-2">
                <span className="text-xs font-bold text-[#D96B27] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">gavel</span>
                  Governing Regulatory Precedent
                </span>
                <p className="text-sm font-semibold text-[#171d1a]">
                  {analysis.keyClause}
                </p>
                <p className="text-xs text-[#404945] leading-relaxed">
                  Insurer: <strong>{analysis.insurer}</strong> • Disputed Claim: <strong>{analysis.claimAmountDisputed}</strong>
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#171d1a] uppercase tracking-wider mb-2">
                  Recommended Recovery Strategy:
                </h4>
                <ul className="flex flex-col gap-2 text-xs text-[#404945]">
                  {analysis.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 bg-[#f5fbf6] p-2.5 rounded-lg border border-[#E2DCD3]">
                      <span className="w-4 h-4 rounded-full bg-[#144439] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-[#ffdbcb]/30 rounded-lg text-xs text-[#692b00] border border-[#ff8843]/30">
                <strong>Advisor Note:</strong> {analysis.advisoryNote}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAnalysis(null)}
                  className="flex-1 h-11 rounded-lg bg-[#eff5f0] hover:bg-[#e4eae5] text-[#171d1a] font-semibold text-xs transition-colors"
                >
                  Recalculate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onProceedToBook(grievanceCategory, insurer, claimAmount);
                    onClose();
                  }}
                  className="flex-2 h-11 rounded-lg bg-[#D96B27] hover:bg-[#c25615] text-white font-semibold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>Book 30-Min Consultation (₹499)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
