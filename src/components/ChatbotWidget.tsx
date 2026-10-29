import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  suggestBooking?: boolean;
}

interface ChatbotWidgetProps {
  onOpenBooking: (prefillConcern?: string) => void;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ onOpenBooking }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Namaste Dost! 🙏 I am your Bima Dost AI assistant. Whether your claim was rejected, delayed, or deductions were made unfairly, ask me in English, हिंदी, or मराठी!'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    if (!textToSend) setInputValue('');
    setLoading(true);

    try {
      const history = newMessages.map(m => ({ role: m.role, text: m.text }));
      const response = await api.sendMessageToChatbot(text, history);

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: response.reply,
          suggestBooking: response.suggestBooking
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: 'Namaste Dost! I could not reach the advisory engine. Please try again or click below to schedule a direct session with our legal panel.',
          suggestBooking: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'model',
        text: 'Namaste Dost! 🙏 Chat reset. How can I help you understand your insurance rights or claim dispute today?'
      }
    ]);
  };

  const handleQuickQuestion = (q: string) => {
    handleSend(q);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Bima Dost AI Chatbot"
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#144439] hover:bg-[#002d24] text-white rounded-full shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-[#bceddd]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-pulse"></span>
            <span className="material-symbols-outlined text-xl">smart_toy</span>
            <div className="text-left">
              <span className="text-xs font-bold font-headline block leading-tight">Bima Dost AI</span>
              <span className="text-[10px] text-[#82b1a2] block leading-tight">Hindi • English • मराठी</span>
            </div>
          </button>
        ) : null}
      </div>

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[400px] h-[560px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#E2DCD3] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[#144439] text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-[#bceddd]">smart_toy</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline font-bold text-sm">Bima Dost AI Advisor</h3>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-[#bceddd] text-[#002019]">
                    Civic AI
                  </span>
                </div>
                <p className="text-[11px] text-[#82b1a2]">
                  Speaks Hindi, English, मराठी & Indian languages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Reset conversation"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Quick Starters Ribbon (if only 1 initial message) */}
          {messages.length === 1 && (
            <div className="bg-[#eff5f0] p-3 border-b border-[#E2DCD3] shrink-0">
              <span className="text-[10px] font-bold text-[#717975] uppercase block mb-1.5">
                Suggested Insurance Queries:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Cashless hospital claim denied? (कैशलेस अस्वीकृत?)',
                  'What is Section 45 3-year rule?',
                  'क्लेम रिजेक्शन कसे चॅलेंज करावे? (मराठी)',
                  'Excessive room rent deductions?'
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(prompt)}
                    className="text-[11px] bg-white border border-[#c0c8c4] hover:border-[#144439] hover:bg-[#144439]/5 text-[#171d1a] px-2.5 py-1 rounded-full text-left transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f5fbf6]/50">
            {messages.map((m, index) => (
              <div
                key={index}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-[#144439] text-white rounded-br-xs'
                      : 'bg-white text-[#171d1a] border border-[#E2DCD3] rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>

                {/* Optional "Book a Consultation" action card inside the chat */}
                {m.suggestBooking && (
                  <div className="mt-2 w-[85%] bg-white p-3 rounded-xl border-2 border-[#D96B27]/40 shadow-xs flex flex-col gap-2 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#692b00]">
                      <span className="material-symbols-outlined text-[#D96B27] text-base">support_agent</span>
                      <span>Consult Legal Claim Panel (₹499)</span>
                    </div>
                    <p className="text-[11px] text-[#404945] leading-tight">
                      Connect 1-on-1 for 30 minutes with ex-claims officers and Insurance Ombudsman advocates.
                    </p>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onOpenBooking();
                      }}
                      className="w-full py-2 bg-[#D96B27] hover:bg-[#c2591a] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Book Consultation Now</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-[#E2DCD3] max-w-[65%] text-xs text-[#717975]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#144439] animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#144439] animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#144439] animate-bounce delay-200"></span>
                <span className="text-[11px]">Bima Dost is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-[#E2DCD3] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask in Hindi, English, Marathi..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-[#eff5f0] text-xs text-[#171d1a] border border-[#E2DCD3] focus:outline-none focus:border-[#144439] focus:bg-white transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                aria-label="Send message"
                className="w-10 h-10 rounded-xl bg-[#144439] hover:bg-[#002d24] text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 text-[10px] text-[#717975] px-1">
              <span>Powered by Gemini AI</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBooking();
                }}
                className="text-[#D96B27] hover:underline font-semibold flex items-center gap-0.5"
              >
                <span>Book Consultation</span>
                <span className="material-symbols-outlined text-[11px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
