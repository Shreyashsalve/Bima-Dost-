import React, { useState, useEffect } from 'react';
import { Advisor, BookingFormState } from '../types';

interface ScheduleStepProps {
  advisors: Advisor[];
  booking: BookingFormState;
  onUpdateBooking: (fields: Partial<BookingFormState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  advisors,
  booking,
  onUpdateBooking,
  onNext,
  onBack
}) => {
  // Current calendar state
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 0-indexed, 9 = October
  const [selectedDate, setSelectedDate] = useState<string>(booking.date || '2026-10-29');
  const [selectedSlot, setSelectedSlot] = useState<string>(booking.timeSlot || '11:15 AM IST');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(booking.advisorId || 'adv_1');

  // Countdown timer for slot hold
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentAdvisor = advisors.find(a => a.id === selectedAdvisorId) || advisors[0];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Generate calendar days
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  // Adjust so Monday is 0
  const adjustedFirstDay = (firstDayIndex + 6) % 7;

  const daysArray = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    daysArray.push({ type: 'empty', day: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const isPast = d < 28 && currentMonth === 9 && currentYear === 2026;
    daysArray.push({
      type: 'day',
      day: d,
      dateStr,
      isPast,
      isWeekend: ((d + adjustedFirstDay - 1) % 7 === 5) || ((d + adjustedFirstDay - 1) % 7 === 6)
    });
  }

  const slotCategories = [
    {
      label: 'Morning Consultation Windows (10:00 AM - 01:00 PM)',
      icon: 'wb_sunny',
      slots: ['10:00 AM IST', '11:15 AM IST', '12:30 PM IST']
    },
    {
      label: 'Afternoon Windows (02:00 PM - 05:00 PM)',
      icon: 'light_mode',
      slots: ['02:30 PM IST', '03:45 PM IST', '04:30 PM IST']
    },
    {
      label: 'Evening / Post-Work Windows (05:00 PM - 07:30 PM)',
      icon: 'wb_twilight',
      slots: ['05:30 PM IST', '06:15 PM IST', '07:00 PM IST']
    }
  ];

  const handleContinue = () => {
    onUpdateBooking({
      date: selectedDate,
      timeSlot: selectedSlot,
      advisorId: selectedAdvisorId
    });
    onNext();
  };

  return (
    <div className="w-full bg-[#f5fbf6] min-h-screen pb-16">
      {/* Top Stepper Banner */}
      <section className="w-full bg-[#eff5f0] py-4 border-b border-[#E2DCD3]">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
            {/* Step 1 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-xs border-2 border-[#144439]">
              <div className="w-7 h-7 rounded-full bg-[#144439] text-white flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-[#D96B27] uppercase tracking-wider">Step 1 • Active</span>
                <span className="text-xs font-bold text-[#171d1a] truncate">Select Date & Time</span>
              </div>
              <span className="material-symbols-outlined text-[#D96B27] ml-auto text-base">calendar_month</span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#e9efea] opacity-80 border border-[#E2DCD3]">
              <div className="w-7 h-7 rounded-full bg-[#dee4df] text-[#404945] flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-medium text-[#404945] uppercase tracking-wider">Step 2</span>
                <span className="text-xs font-medium text-[#171d1a] truncate">Grievance Details</span>
              </div>
              <span className="material-symbols-outlined text-[#717975] ml-auto text-base">badge</span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#e9efea] opacity-80 border border-[#E2DCD3]">
              <div className="w-7 h-7 rounded-full bg-[#dee4df] text-[#404945] flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-medium text-[#404945] uppercase tracking-wider">Step 3</span>
                <span className="text-xs font-medium text-[#171d1a] truncate">Review & Pay</span>
              </div>
              <span className="material-symbols-outlined text-[#717975] ml-auto text-base">payments</span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#e9efea] opacity-80 border border-[#E2DCD3]">
              <div className="w-7 h-7 rounded-full bg-[#dee4df] text-[#404945] flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-medium text-[#404945] uppercase tracking-wider">Step 4</span>
                <span className="text-xs font-medium text-[#171d1a] truncate">Official Docket</span>
              </div>
              <span className="material-symbols-outlined text-[#717975] ml-auto text-base">verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notice Bar */}
      <div className="bg-[#144439] text-white">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#bceddd]">schedule</span>
            <span>All time slots displayed in <strong>India Standard Time (IST, UTC+05:30)</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[#bceddd]">
              <span className="w-2 h-2 rounded-full bg-[#bceddd] animate-ping"></span>
              Live Advisor Availability
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">100% Refundable up to 2 hrs prior</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <section className="max-w-[1200px] mx-auto w-full px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Calendar & Time Slots (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  type="button"
                  onClick={onBack}
                  className="text-xs text-[#144439] font-semibold flex items-center gap-1 hover:underline mb-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Overview
                </button>
                <h1 className="font-headline font-bold text-2xl text-[#002d24] tracking-tight">
                  Choose your appointment date & time
                </h1>
                <p className="text-xs text-[#404945] mt-0.5">
                  Select an available calendar date to view consultation slots with certified claims advocates.
                </p>
              </div>
            </div>

            {/* Specialist Switcher */}
            <div className="bg-white rounded-xl p-4 border border-[#E2DCD3] shadow-xs flex flex-col gap-2">
              <label className="text-xs font-bold text-[#171d1a] uppercase tracking-wider flex items-center justify-between">
                <span>Selected Claims Specialist</span>
                <span className="text-[11px] text-[#D96B27] font-semibold">Change advisor if preferred</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {advisors.map(adv => (
                  <button
                    key={adv.id}
                    type="button"
                    onClick={() => setSelectedAdvisorId(adv.id)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      selectedAdvisorId === adv.id
                        ? 'border-[#144439] bg-[#eff5f0] shadow-xs'
                        : 'border-[#E2DCD3] bg-white hover:border-[#c0c8c4]'
                    }`}
                  >
                    <img
                      src={adv.avatar}
                      alt={adv.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#171d1a] truncate">{adv.name}</p>
                      <p className="text-[10px] text-[#404945] truncate">{adv.experience} exp</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Card */}
            <div className="bg-white rounded-xl p-5 border border-[#E2DCD3] shadow-xs flex flex-col gap-4">
              {/* Month Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#eff5f0]">
                <div className="flex items-center gap-2">
                  <span className="font-headline font-bold text-base text-[#171d1a]">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#eff5f0] text-[#144439] text-[10px] font-bold">
                    Official Slot Calendar
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-lg bg-[#eff5f0] hover:bg-[#e4eae5] text-[#171d1a] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-lg bg-[#eff5f0] hover:bg-[#e4eae5] text-[#171d1a] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#404945]">
                <span className="py-1">Mon</span>
                <span className="py-1">Tue</span>
                <span className="py-1">Wed</span>
                <span className="py-1">Thu</span>
                <span className="py-1">Fri</span>
                <span className="py-1 text-[#D96B27]">Sat</span>
                <span className="py-1 text-[#D96B27]">Sun</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                {daysArray.map((item, idx) => {
                  if (item.type === 'empty') {
                    return <div key={idx} className="h-12 rounded-lg bg-[#f5fbf6]/40 opacity-30"></div>;
                  }

                  const isSelected = item.dateStr === selectedDate;
                  const isPast = item.isPast;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isPast}
                      onClick={() => item.dateStr && setSelectedDate(item.dateStr)}
                      className={`h-12 rounded-lg p-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isPast
                          ? 'opacity-40 cursor-not-allowed text-[#717975] bg-[#eff5f0]'
                          : isSelected
                          ? 'bg-[#144439] text-white shadow-sm font-bold scale-[1.02]'
                          : 'bg-[#eff5f0] hover:bg-[#e4eae5] text-[#171d1a] font-medium'
                      }`}
                    >
                      <span className="text-xs leading-none">{item.day}</span>
                      {isSelected ? (
                        <span className="text-[9px] text-[#bceddd] uppercase font-bold mt-0.5">Selected</span>
                      ) : !isPast ? (
                        <span className="text-[9px] text-[#144439] font-medium mt-0.5">Open</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Selection */}
            <div className="bg-white rounded-xl p-5 border border-[#E2DCD3] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-sm text-[#002d24]">
                    Available 30-Minute Consultation Windows
                  </h3>
                  <p className="text-xs text-[#404945]">
                    Selected Date: <strong>{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#144439] bg-[#eff5f0] px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#144439]"></span>
                  Direct Call
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {slotCategories.map((cat, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-[#404945] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#D96B27]">{cat.icon}</span>
                      {cat.label}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cat.slots.map(s => {
                        const isChosen = selectedSlot === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSlot(s)}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isChosen
                                ? 'bg-[#D96B27] text-white border-[#D96B27] shadow-xs'
                                : 'bg-[#eff5f0] hover:bg-[#e4eae5] text-[#171d1a] border-[#E2DCD3]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span>{s}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Reassurance & Slot Hold Summary (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Slot Hold Card */}
            <div className="bg-white rounded-2xl p-5 border border-[#E2DCD3] shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#eff5f0]">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eff5f0] text-[#144439] text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">lock_clock</span>
                  <span>Slot Held: {formatTimer(timeLeft)} mins</span>
                </div>
                <span className="text-xs text-[#717975]">Direct Private Session</span>
              </div>

              {/* Specialist Details */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#eff5f0] border border-[#c0c8c4]/40">
                <img
                  src={currentAdvisor.avatar}
                  alt={currentAdvisor.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#002d24] flex items-center gap-1">
                    {currentAdvisor.name}
                    <span className="material-symbols-outlined text-xs text-[#144439]">verified</span>
                  </p>
                  <p className="text-[11px] text-[#404945] truncate">{currentAdvisor.title}</p>
                  <p className="text-[10px] text-[#717975]">{currentAdvisor.barCouncilOrLicence}</p>
                </div>
              </div>

              {/* Timing Summary */}
              <div className="bg-[#f5fbf6] p-3 rounded-xl border border-[#E2DCD3] flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between items-center text-[#404945]">
                  <span>Date:</span>
                  <strong className="text-[#171d1a]">
                    {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-[#404945]">
                  <span>Window:</span>
                  <strong className="text-[#D96B27]">{selectedSlot}</strong>
                </div>
                <div className="flex justify-between items-center text-[#404945]">
                  <span>Duration:</span>
                  <strong className="text-[#171d1a]">30 Minutes Direct Call</strong>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="flex flex-col gap-1.5 pt-1 text-xs">
                <div className="flex justify-between text-[#404945]">
                  <span>Advocate Grievance Session</span>
                  <span className="font-semibold text-[#171d1a]">₹422.88</span>
                </div>
                <div className="flex justify-between text-[#404945]">
                  <span>18% GST (CGST 9% + SGST 9%)</span>
                  <span className="font-semibold text-[#171d1a]">₹76.12</span>
                </div>
                <div className="flex justify-between text-[#144439] font-medium">
                  <span>Platform Commission</span>
                  <span className="font-bold">₹0.00 (Zero Cut)</span>
                </div>
                <div className="border-t border-[#E2DCD3] pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-[#002d24]">Total Payable:</span>
                  <span className="font-headline font-bold text-xl text-[#002d24]">₹499.00</span>
                </div>
              </div>

              {/* CTA Continue */}
              <button
                type="button"
                onClick={handleContinue}
                className="w-full min-h-[50px] rounded-lg bg-[#D96B27] hover:bg-[#c25615] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Continue to Grievance Details</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <div className="text-[11px] text-center text-[#717975] flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#144439]">shield</span>
                <span>Free rescheduling & 100% refund up to 2 hrs prior</span>
              </div>
            </div>

            {/* Trust Accordion Badge */}
            <div className="bg-[#eff5f0] p-4 rounded-xl border border-[#c0c8c4]/60 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#144439] text-xl shrink-0 mt-0.5">verified_user</span>
              <div className="text-xs text-[#404945]">
                <strong className="text-[#171d1a] block mb-0.5">Independent Advocacy Guarantee</strong>
                Your advocate never shares your case details or files with the insurer. All legal rights remain fully protected under attorney-client privilege.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
