import React, { useState } from 'react';
import { Advisor, Language } from '../types';

interface HomeLandingProps {
  language: Language;
  advisors: Advisor[];
  onSelectProblem: (problem: string) => void;
  onSelectAdvisor: (advisorId: string) => void;
  onOpenCalculator: () => void;
  onStartBooking: () => void;
}

export const HomeLanding: React.FC<HomeLandingProps> = ({
  language,
  advisors,
  onSelectProblem,
  onSelectAdvisor,
  onOpenCalculator,
  onStartBooking
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const t = {
    en: {
      badge: 'Bima Dost • Your Trusted Insurance Friend',
      heroTitle: 'Confused About Your Insurance Claim?',
      heroSubtitle:
        'Speak directly with a verified insurance specialist. Understand why your claim is stuck or disputed, and get clear legal guidance in 30 minutes.',
      bookBtn: 'Book a Consultation (₹499)',
      howItWorksBtn: 'See How It Works ↓',
      feeNote: 'Fixed Fee • No Hidden Cuts • Zero Commission on Recovery',
      onDutyTitle: 'Specialist On Duty',
      onDutyDuration: '30-Min Direct Call',
      onDutyDesc: 'Includes case analysis, clause review, and step-by-step ombudsman appeal roadmap.',
      matchBtn: 'Select Your Issue to Match',
      triageTitle: 'What do you need help with?',
      triageSubtitle: 'Select your current dispute to match with the right former claims officer.',
      zeroUpload: 'Zero policy upload required to start',
      howItWorksTitle: 'How It Works in 3 Simple Steps',
      howItWorksSubtitle: 'A structured, dignified way to resolve your insurance disputes.',
      step1Title: 'Select Your Dispute & Book a Slot',
      step1Desc: 'Pick your insurance issue and choose an open 30-minute window with a registered advocate.',
      step2Title: 'Direct One-on-One Private Call',
      step2Desc: 'Your advisor calls your phone directly. No complex app install or video camera needed.',
      step3Title: 'Receive Recovery Roadmap & Docket',
      step3Desc: 'Get an official appeal roadmap with applicable IRDAI circulars for your insurer or ombudsman.',
      coverTitle: 'What We Cover Across Indian Insurers',
      coverSubtitle: 'Comprehensive grievance support across all retail and group policies.',
      advisorsTitle: 'Our Verified Claims Specialists',
      advisorsSubtitle: 'Former ombudsman advocates, insurance company claims heads, and medico-legal counsels.',
      statutorySeal: 'Statutory Claim Governance Seal',
      statutorySealDesc: 'Consultations governed under Consumer Protection (E-Commerce) Rules and Insurance Ombudsman Regulations 2017.',
      faqTitle: 'Frequently Asked Questions'
    },
    hi: {
      badge: 'बीमा दोस्त • आपका सच्चा और स्वतंत्र बीमा सलाहकार',
      heroTitle: 'क्या आपका बीमा क्लेम अटक गया या रिजेक्ट हुआ?',
      heroSubtitle:
        'पूर्व क्लेम अधिकारियों और अनुभवी वकीलों से सीधी 30 मिनट की निजी बातचीत करें। समझें कि क्लेम क्यों रुका है और कानूनी समाधान पाएं।',
      bookBtn: 'परामर्श बुक करें (₹499)',
      howItWorksBtn: 'प्रक्रिया देखें ↓',
      feeNote: 'निश्चित शुल्क • शून्य कमीशन • क्लेम राशि में कोई कटौती नहीं',
      onDutyTitle: 'ऑन-ड्यूटी वरिष्ठ विशेषज्ञ',
      onDutyDuration: '30 मिनट सीधी कॉल',
      onDutyDesc: 'केस विश्लेषण, रिजेक्शन क्लॉज जांच और ओम्बड्समैन अपील का लिखित रोडमैप शामिल।',
      matchBtn: 'अपनी समस्या चुनकर विशेषज्ञ से मिलें',
      triageTitle: 'आपको किस सहायता की आवश्यकता है?',
      triageSubtitle: 'सही विशेषज्ञ से मैच होने के लिए अपना मामला चुनें।',
      zeroUpload: 'शुरुआत में कोई दस्तावेज अपलोड अनिवार्य नहीं',
      howItWorksTitle: '3 सरल चरणों में क्लेम समाधान',
      howItWorksSubtitle: 'सम्मानजनक और पारदर्शी तरीके से अपनी कानूनी हक की लड़ाई लड़ें।',
      step1Title: '1. मामला चुनें और समय तय करें',
      step1Desc: 'अपनी समस्या चुनें और विशेषज्ञ के साथ 30 मिनट का स्लॉट बुक करें।',
      step2Title: '2. विशेषज्ञ की सीधी फोन कॉल',
      step2Desc: 'सलाहकार सीधे आपके मोबाइल नंबर पर कॉल करते हैं। किसी ऐप की जरूरत नहीं।',
      step3Title: '3. अपील रोडमैप और डॉकेट प्राप्त करें',
      step3Desc: 'IRDAI नियमों और कानूनी धाराओं के साथ औपचारिक अपील का प्रारूप पाएं।',
      coverTitle: 'हम किन बीमा मामलों में सहायता करते हैं',
      coverSubtitle: 'हेल्थ, मोटर, लाइफ और कॉर्पोरेट पॉलिसी से संबंधित सभी विवाद।',
      advisorsTitle: 'हमारे सत्यापित क्लेम विशेषज्ञ',
      advisorsSubtitle: 'पूर्व ओम्बड्समैन कानूनी अधिकारी और वरिष्ठ बीमा दावेदार।',
      statutorySeal: 'वैधानिक बीमा शासन मुहर',
      statutorySealDesc: 'कंज्यूमर प्रोटेक्शन एक्ट 2019 और बीमा लोकपाल नियम 2017 के तहत पूरी तरह संरक्षित।',
      faqTitle: 'अक्सर पूछे जाने वाले सवाल'
    },
    mr: {
      badge: 'विमा दोस्त • तुमचा विश्वासू आणि स्वतंत्र विमा मार्गदर्शक',
      heroTitle: 'तुमचा विमा क्लेम अडकलाय किंवा फेटाळला गेलाय?',
      heroSubtitle:
        'माजी विमा अधिकारी आणि कायदेतज्ज्ञांशी थेट 30 मिनिटे बोला. क्लेम का अडकलाय ते समजून घ्या आणि कायदेशीर मार्गदर्शन मिळवा.',
      bookBtn: 'सल्ला बुक करा (₹499)',
      howItWorksBtn: 'कसे चालते ते पहा ↓',
      feeNote: 'निश्चित फी • शून्य टक्केवारी • पूर्ण पारदर्शकता',
      onDutyTitle: 'ऑन-ड्युटी तज्ज्ञ सल्लागार',
      onDutyDuration: '30 मिनिटे थेट कॉल',
      onDutyDesc: 'केस तपासणी, पॉलिसी अटींचे पुनरावलोकन आणि ओम्बड्समन अपीलाचा रोडमॅप समाविष्ट.',
      matchBtn: 'समस्या निवडून सल्लागाराशी जोडा',
      triageTitle: 'तुम्हाला कशासाठी मदत हवी आहे?',
      triageSubtitle: 'योग्य माजी अधिकाऱ्याशी जोडण्यासाठी समस्येचा प्रकार निवडा.',
      zeroUpload: 'सुरुवातीला कागदपत्रे अपलोड करण्याची गरज नाही',
      howItWorksTitle: '3 सोप्या पायऱ्यांमध्ये प्रक्रिया',
      howItWorksSubtitle: 'विमा तक्रार निवारणासाठी विश्वासार्ह आणि सोपी पायरी.',
      step1Title: '1. समस्येचा प्रकार आणि वेळ निवडा',
      step1Desc: 'तुमची समस्या निवडा आणि 30 मिनिटांची उपलब्ध वेळ निश्चित करा.',
      step2Title: '2. फोनवर थेट चर्चा',
      step2Desc: 'सल्लागार थेट तुमच्या फोन नंबरवर कॉल करतील. कोणत्याही अ‍ॅपची गरज नाही.',
      step3Title: '3. अधिकृत रोडमॅप मिळवा',
      step3Desc: 'IRDAI नियमांनुसार इन्शुरन्स कंपनी आणि ओम्बड्समनसमोर मांडण्यासाठी कायदेशीर मसुदा मिळवा.',
      coverTitle: 'आम्ही कोणकोणत्या दाव्यांमध्ये मदत करतो',
      coverSubtitle: 'आरोग्य, वाहन, जीवन विमा आणि क्रिटिकल आजार दावे.',
      advisorsTitle: 'सत्यापित क्लेम तज्ज्ञ',
      advisorsSubtitle: 'माजी ओम्बड्समन वकील आणि इन्शुरन्स क्लेम अधिकारी.',
      statutorySeal: 'वैधानिक तक्रार निवारण शिक्का',
      statutorySealDesc: 'ग्राहक संरक्षण कायदा 2019 आणि इन्शुरन्स ओम्बड्समन नियम 2017 अंतर्गत सल्ला.',
      faqTitle: 'वारंवार विचारले जाणारे प्रश्न'
    }
  }[language];

  const triageOptions = [
    {
      id: 'Claim Rejected',
      title: 'Claim Rejected',
      icon: 'shield_with_heart',
      desc: 'Denied due to pre-existing condition, non-disclosure, or exclusion clause.',
      tag: 'Section 45 Protection'
    },
    {
      id: 'Claim Delayed',
      title: 'Claim Delayed (>15 Days)',
      icon: 'hourglass_empty',
      desc: 'Cashless discharge or reimbursement settlement stuck beyond IRDAI 15-day limit.',
      tag: 'Interest Penalty 8.5%'
    },
    {
      id: 'Payment Less Than Expected',
      title: 'Payment Less Than Expected',
      icon: 'receipt_long',
      desc: 'Arbitrary deductions on room rent limits, medical consumables, or copay ratios.',
      tag: 'Proportionate Cap Contest'
    },
    {
      id: 'Help Understanding Policy',
      title: 'Policy Review & Pre-Hospitalization',
      icon: 'find_in_page',
      desc: 'Check coverage clauses before scheduled surgery, porting review, or room limits.',
      tag: 'Pre-Claim Safe Audit'
    }
  ];

  const coverageAreas = [
    {
      icon: 'health_and_safety',
      title: 'Health & Mediclaim Insurance',
      points: [
        'Pre-Existing Disease (PED) 3-year clause defence',
        'Hospital room rent proportionate deduction waiver',
        'Medical consumables & modern treatment denials',
        'Robotic surgery & daycare procedure exclusions'
      ]
    },
    {
      icon: 'directions_car',
      title: 'Motor & Vehicle Insurance',
      points: [
        'Total Loss (TL) and Constructive Total Loss (CTL) disputes',
        'Depreciation schedule and zero-dep denial contest',
        'Surveyor report undervaluation and salvage deduction',
        'Third-party property and accident liability'
      ]
    },
    {
      icon: 'family_restroom',
      title: 'Life, Term & Critical Illness',
      points: [
        'Non-disclosure repudiation contest under Section 45',
        'Death claim investigation delay exceeding 90 days',
        'Accidental death benefit rejection appeals',
        'Critical illness lump-sum diagnosis criteria check'
      ]
    },
    {
      icon: 'corporate_fare',
      title: 'Corporate Group Health (GMC)',
      points: [
        'Corporate buffer exhaustion and HR appeal draft',
        'Maternity and dependent parental claim ceilings',
        'TPA cashless refusal at network hospital counter',
        'Post-resignation retail policy portability rights'
      ]
    }
  ];

  const faqs = [
    {
      q: 'Will Bima Dost take a commission if my claim is approved?',
      a: 'Absolutely NOT. We strictly operate on a fixed transparent fee of ₹499 for the 30-minute consultation. We never charge any percentage or cut from your recovered claim amount.'
    },
    {
      q: 'Can the Insurance Ombudsman really reverse my insurer’s rejection?',
      a: 'Yes. The Insurance Ombudsman is a statutory quasi-judicial authority established under the Insurance Ombudsman Rules 2017. Their award is legally binding on the insurance company up to ₹50 Lakhs.'
    },
    {
      q: 'What if I need to cancel or reschedule my appointment?',
      a: 'You can reschedule for free at any time. Cancellations made at least 2 hours before the scheduled time receive an instant 100% refund of ₹499 back to your original payment method.'
    },
    {
      q: 'How does the consultation call take place?',
      a: 'Your assigned claims advocate calls your mobile phone number directly at the scheduled time. There is no need to download third-party video apps or configure webcams.'
    },
    {
      q: 'What documents should I keep ready before the call?',
      a: 'Keep your claim rejection or deduction letter, hospital discharge summary, and policy bond handy so your advocate can inspect the specific repudiation grounds.'
    }
  ];

  return (
    <div className="flex flex-col w-full bg-[#f5fbf6]">
      {/* SECTION 1: HERO */}
      <section className="relative w-full overflow-hidden bg-[#f5fbf6] py-10 lg:py-16 border-b border-[#E2DCD3]">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col items-start gap-4">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#e4eae5] text-[#144439] border border-[#c0c8c4]/40">
                <span className="material-symbols-outlined text-sm text-[#D96B27]">verified</span>
                <span className="text-xs font-semibold text-[#171d1a]">{t.badge}</span>
              </div>

              <h1 className="font-headline font-bold text-3xl sm:text-4xl lg:text-[42px] leading-tight text-[#002d24] tracking-tight">
                {t.heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-[#404945] max-w-xl leading-relaxed">
                {t.heroSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full pt-2">
                <button
                  onClick={onStartBooking}
                  className="inline-flex items-center justify-center px-6 min-h-[52px] rounded-lg bg-[#D96B27] hover:bg-[#c25615] text-white font-bold text-base shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl mr-2">calendar_month</span>
                  {t.bookBtn}
                </button>
                <button
                  onClick={onOpenCalculator}
                  className="inline-flex items-center justify-center gap-1.5 px-5 min-h-[52px] rounded-lg bg-[#ffffff] border border-[#E2DCD3] hover:border-[#144439] text-[#144439] font-semibold text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg text-[#D96B27]">calculate</span>
                  <span>Check Ombudsman Merit</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#e9efea] text-[#171d1a] text-xs font-medium border border-[#c0c8c4]/40">
                  <span className="material-symbols-outlined text-xs text-[#D96B27]">payments</span>
                  {t.feeNote}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#e9efea] text-[#171d1a] text-xs font-medium border border-[#c0c8c4]/40">
                  <span className="material-symbols-outlined text-xs text-[#144439]">gavel</span>
                  Ombudsman Rules 2017 Compliant
                </span>
              </div>
            </div>

            {/* Right Column: Specialist Feature Card */}
            <div className="lg:col-span-5 w-full">
              <div className="relative bg-[#ffffff] rounded-2xl shadow-md p-6 overflow-hidden flex flex-col gap-4 border border-[#E2DCD3]">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff5f0] text-[#144439] text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#144439] inline-block animate-pulse"></span>
                    {t.onDutyTitle}
                  </span>
                  <span className="text-xs font-medium text-[#404945]">{t.onDutyDuration}</span>
                </div>

                <div className="flex items-center gap-4">
                  <img
                    alt="Advocate Rajesh Sharma"
                    className="w-20 h-20 rounded-xl object-cover shadow-sm shrink-0 border border-[#E2DCD3]"
                    src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=300"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline font-bold text-lg text-[#002d24]">
                      Rajesh Sharma
                    </span>
                    <span className="text-xs font-semibold text-[#171d1a]">
                      Ex-Claims Officer & Advocate (14 yrs exp)
                    </span>
                    <span className="text-xs text-[#404945] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-xs text-[#144439]">verified</span>
                      IRDAI/AD-88412 • Bar Council of Delhi
                    </span>
                    <div className="flex items-center gap-1 text-xs text-[#D96B27] font-bold mt-1">
                      <span>★ 4.9</span>
                      <span className="text-[#404945] font-normal">(842 policyholders assisted)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#eff5f0] text-[#171d1a] text-xs flex items-center gap-2 border border-[#c0c8c4]/40">
                  <span className="material-symbols-outlined text-[#144439] text-base shrink-0">check_circle</span>
                  <span>{t.onDutyDesc}</span>
                </div>

                <button
                  onClick={() => {
                    onSelectAdvisor('adv_1');
                    onStartBooking();
                  }}
                  className="w-full min-h-[46px] rounded-lg bg-[#144439] hover:bg-[#002d24] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Book Session with Rajesh Sharma (₹499)</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: PROBLEM SELECTION TRIAGE */}
      <section className="w-full bg-[#eff5f0] py-12 lg:py-16 border-b border-[#E2DCD3]" id="problem-selection">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="flex flex-col gap-1 max-w-xl">
              <span className="text-xs font-bold text-[#D96B27] uppercase tracking-widest">
                Triage Step 1
              </span>
              <h2 className="font-headline font-bold text-2xl lg:text-3xl text-[#002d24] tracking-tight">
                {t.triageTitle}
              </h2>
              <p className="text-sm text-[#404945]">{t.triageSubtitle}</p>
            </div>
            <div className="text-xs text-[#404945] flex items-center gap-1 font-medium bg-white px-3 py-1.5 rounded-lg border border-[#E2DCD3]">
              <span className="material-symbols-outlined text-sm text-[#144439]">lock</span>
              <span>{t.zeroUpload}</span>
            </div>
          </div>

          {/* 4 Clean Triage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {triageOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectProblem(opt.id)}
                className="text-left flex flex-col justify-between p-5 rounded-xl bg-white border border-[#E2DCD3] hover:border-[#144439] hover:shadow-md transition-all h-full gap-4 group cursor-pointer"
              >
                <div className="flex flex-col gap-3">
                  <div className="w-11 h-11 rounded-lg bg-[#eff5f0] text-[#144439] flex items-center justify-center group-hover:bg-[#144439] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base text-[#171d1a] group-hover:text-[#144439]">
                      {opt.title}
                    </h3>
                    <p className="text-xs text-[#404945] mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full pt-3 border-t border-[#eff5f0]">
                  <span className="text-[11px] font-bold text-[#D96B27] bg-[#ffdbcb]/30 px-2 py-0.5 rounded">
                    {opt.tag}
                  </span>
                  <span className="text-xs font-bold text-[#144439] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    Select <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS */}
      <section className="w-full bg-[#f5fbf6] py-14 border-b border-[#E2DCD3]" id="how-it-works">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 flex flex-col gap-8">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
            <span className="text-xs font-bold text-[#D96B27] uppercase tracking-wider">
              Structured Grievance Process
            </span>
            <h2 className="font-headline font-bold text-2xl lg:text-3xl text-[#002d24]">
              {t.howItWorksTitle}
            </h2>
            <p className="text-sm text-[#404945]">{t.howItWorksSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2DCD3] shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-[#144439] text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-headline font-bold text-base text-[#002d24]">
                {t.step1Title}
              </h3>
              <p className="text-sm text-[#404945] leading-relaxed">
                {t.step1Desc}
              </p>
              <div className="mt-auto pt-3 text-xs text-[#144439] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Instant calendar confirmation
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2DCD3] shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D96B27] text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-headline font-bold text-base text-[#002d24]">
                {t.step2Title}
              </h3>
              <p className="text-sm text-[#404945] leading-relaxed">
                {t.step2Desc}
              </p>
              <div className="mt-auto pt-3 text-xs text-[#D96B27] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">phone_in_talk</span>
                Hindi, English or Marathi
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2DCD3] shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-[#144439] text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-headline font-bold text-base text-[#002d24]">
                {t.step3Title}
              </h3>
              <p className="text-sm text-[#404945] leading-relaxed">
                {t.step3Desc}
              </p>
              <div className="mt-auto pt-3 text-xs text-[#144439] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                Ombudsman Rule 13(1)(b) ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: WHAT WE COVER */}
      <section className="w-full bg-[#eff5f0] py-14 border-b border-[#E2DCD3]" id="what-we-cover">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#D96B27] uppercase tracking-wider">
                Full Spectrum Coverage
              </span>
              <h2 className="font-headline font-bold text-2xl lg:text-3xl text-[#002d24]">
                {t.coverTitle}
              </h2>
            </div>
            <p className="text-sm text-[#404945] max-w-md">{t.coverSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coverageAreas.map((area, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-[#E2DCD3] shadow-xs flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#eff5f0] text-[#144439] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">{area.icon}</span>
                  </div>
                  <h3 className="font-headline font-bold text-lg text-[#002d24]">
                    {area.title}
                  </h3>
                </div>
                <ul className="grid grid-cols-1 gap-2.5">
                  {area.points.map((pt, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs sm:text-sm text-[#404945]">
                      <span className="material-symbols-outlined text-sm text-[#144439] shrink-0 mt-0.5">
                        check
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: VERIFIED SPECIALISTS */}
      <section className="w-full bg-[#f5fbf6] py-14 border-b border-[#E2DCD3]" id="advisors-section">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 flex flex-col gap-8">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
            <span className="text-xs font-bold text-[#D96B27] uppercase tracking-wider">
              Independent Legal Panel
            </span>
            <h2 className="font-headline font-bold text-2xl lg:text-3xl text-[#002d24]">
              {t.advisorsTitle}
            </h2>
            <p className="text-sm text-[#404945]">{t.advisorsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {advisors.map((adv) => (
              <div
                key={adv.id}
                className="bg-white rounded-2xl p-6 border border-[#E2DCD3] shadow-sm flex flex-col justify-between gap-5"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <img
                      src={adv.avatar}
                      alt={adv.name}
                      className="w-16 h-16 rounded-xl object-cover border border-[#E2DCD3]"
                    />
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D96B27] bg-[#ffdbcb]/30 px-2 py-1 rounded">
                      ★ {adv.rating} ({adv.reviewsCount})
                    </span>
                  </div>

                  <div>
                    <h3 className="font-headline font-bold text-lg text-[#002d24] flex items-center gap-1">
                      {adv.name}
                      <span className="material-symbols-outlined text-base text-[#144439]">verified</span>
                    </h3>
                    <p className="text-xs font-semibold text-[#171d1a] mt-0.5">{adv.title}</p>
                    <p className="text-xs text-[#404945]">{adv.experience} claims dispute practice</p>
                  </div>

                  <div className="text-xs text-[#404945] bg-[#eff5f0] p-3 rounded-xl border border-[#c0c8c4]/40">
                    <span className="font-bold text-[#171d1a] block mb-1">Focus Area:</span>
                    {adv.specialization}
                  </div>

                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {adv.languages.map((l, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#e9efea] text-[#171d1a] font-medium">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#eff5f0] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#404945] block">Session Fee</span>
                    <span className="font-headline font-bold text-base text-[#002d24]">₹499 <span className="text-xs font-normal text-[#404945]">/ 30 min</span></span>
                  </div>
                  <button
                    onClick={() => {
                      onSelectAdvisor(adv.id);
                      onStartBooking();
                    }}
                    className="px-4 py-2 rounded-lg bg-[#144439] hover:bg-[#002d24] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Select Slot →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: STATUTORY GOVERNANCE & CIVIC SEAL */}
      <section className="w-full bg-[#144439] text-white py-12">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                <span className="material-symbols-outlined text-3xl">account_balance</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl text-[#bceddd]">
                  {t.statutorySeal}
                </h3>
                <p className="text-sm text-[#e8f2ee] mt-1 leading-relaxed">
                  {t.statutorySealDesc}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-[#82b1a2]">
                  <span>• Insurance Act 1938 (Section 45 Protection)</span>
                  <span>• IRDAI Master Circular on Health Insurance 2024</span>
                  <span>• Consumer Protection Act 2019</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
              <button
                onClick={onStartBooking}
                className="w-full py-3.5 px-6 rounded-lg bg-[#D96B27] hover:bg-[#c25615] text-white font-bold text-sm shadow-md transition-all text-center cursor-pointer"
              >
                Book Your Docket Now (₹499)
              </button>
              <button
                onClick={onOpenCalculator}
                className="w-full py-3 px-6 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors text-center cursor-pointer"
              >
                Run Free Claim Merit Check
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FAQ ACCORDION */}
      <section className="w-full bg-[#eff5f0] py-14">
        <div className="max-w-[800px] mx-auto px-4 lg:px-6 flex flex-col gap-6">
          <div className="text-center">
            <span className="text-xs font-bold text-[#D96B27] uppercase tracking-wider">
              Clarifications & Rights
            </span>
            <h2 className="font-headline font-bold text-2xl lg:text-3xl text-[#002d24] mt-1">
              {t.faqTitle}
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-[#E2DCD3] overflow-hidden shadow-xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-semibold text-sm text-[#171d1a] flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined text-base text-[#144439] shrink-0">
                    {activeFaq === idx ? 'remove' : 'add'}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-[#404945] leading-relaxed border-t border-[#eff5f0] pt-3 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
