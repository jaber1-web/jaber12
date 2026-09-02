import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Send,
  Copy,
  Check,
  Bell,
  HeartHandshake,
  HelpCircle,
  PenTool,
  Phone,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { EventAttendee, EventItem } from '../types';
import { useApp } from '../context/AppContext';
import {
  WhatsAppTemplateType,
  WHATSAPP_TEMPLATES,
  buildWhatsAppMessage,
  openWhatsAppChat,
  formatPhoneForWhatsApp,
} from '../utils/whatsappUtils';

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: EventAttendee | null;
  event: EventItem | null;
}

export const WhatsAppMessageModal: React.FC<WhatsAppMessageModalProps> = ({
  isOpen,
  onClose,
  attendee,
  event,
}) => {
  const { settings } = useApp();

  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateType>('reminder');
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial template and phone based on attendee status
  useEffect(() => {
    if (!attendee || !event) return;

    // Pick sensible default template
    let defaultType: WhatsAppTemplateType = 'reminder';
    if (attendee.status === 'present') {
      defaultType = 'thank_you';
    } else if (attendee.status === 'absent') {
      defaultType = 'absent_inquiry';
    } else {
      defaultType = 'reminder';
    }
    setSelectedTemplate(defaultType);

    // Pick phone number
    const primaryPhone = attendee.phone?.trim() || attendee.stcNumber?.trim() || '';
    setSelectedPhone(primaryPhone);
    setManualPhone(primaryPhone);

    // Build initial message
    const initialText = buildWhatsAppMessage({
      type: defaultType,
      attendeeName: attendee.name,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      orgName: settings.orgName,
    });
    setMessageText(initialText);
    setError(null);
    setCopied(false);
  }, [attendee, event, settings.orgName, isOpen]);

  // When template changes, regenerate the message
  const handleTemplateChange = (type: WhatsAppTemplateType) => {
    setSelectedTemplate(type);
    if (!attendee || !event) return;

    const newText = buildWhatsAppMessage({
      type,
      attendeeName: attendee.name,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      orgName: settings.orgName,
      customText: type === 'custom' ? messageText : undefined,
    });
    setMessageText(newText);
  };

  if (!isOpen || !attendee || !event) return null;

  const currentPhone = selectedPhone.trim() || manualPhone.trim();
  const formattedPhone = formatPhoneForWhatsApp(currentPhone);
  const hasPhone = Boolean(formattedPhone);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleSend = () => {
    if (!currentPhone) {
      setError('يرجى تحديد أو إدخال رقم الجوال أولاً');
      return;
    }
    const success = openWhatsAppChat(currentPhone, messageText);
    if (!success) {
      setError('رقم الجوال غير صالح للإرسال عبر واتساب');
      return;
    }
    onClose();
  };

  const getTemplateIcon = (type: WhatsAppTemplateType) => {
    switch (type) {
      case 'reminder':
        return <Bell className="w-4 h-4 text-blue-600" />;
      case 'thank_you':
        return <HeartHandshake className="w-4 h-4 text-emerald-600" />;
      case 'absent_inquiry':
        return <HelpCircle className="w-4 h-4 text-rose-600" />;
      case 'custom':
        return <PenTool className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">مراسلة عبر واتساب</h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                إلى: <span className="font-bold text-white">{attendee.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Attendee Info & Phone selection */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between font-medium text-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900">{attendee.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    attendee.status === 'present'
                      ? 'bg-emerald-100 text-emerald-800'
                      : attendee.status === 'absent'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {attendee.status === 'present' ? 'حاضر ✅' : attendee.status === 'absent' ? 'غائب ❌' : 'معلق ⏳'}
                </span>
              </div>
              <span className="text-gray-500 font-mono text-[11px]">{event.title}</span>
            </div>

            {/* Phone numbers options */}
            <div className="pt-1 border-t border-gray-200 flex flex-wrap items-center gap-2">
              <span className="text-gray-500 text-[11px] flex items-center gap-1">
                <Phone className="w-3 h-3" /> الرقم المستهدف:
              </span>

              {attendee.phone && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhone(attendee.phone);
                    setManualPhone(attendee.phone);
                    setError(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    currentPhone === attendee.phone
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                  dir="ltr"
                >
                  الجوال: {attendee.phone}
                </button>
              )}

              {attendee.stcNumber && attendee.stcNumber !== attendee.phone && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhone(attendee.stcNumber);
                    setManualPhone(attendee.stcNumber);
                    setError(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    currentPhone === attendee.stcNumber
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                  dir="ltr"
                >
                  STC: {attendee.stcNumber}
                </button>
              )}

              {!attendee.phone && !attendee.stcNumber && (
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => {
                      setManualPhone(e.target.value);
                      setSelectedPhone(e.target.value);
                      setError(null);
                    }}
                    placeholder="أدخل رقم الجوال (05xxxxxxxx)"
                    className="w-full px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-xs font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    dir="ltr"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                اختر نوع الرسالة:
              </span>
              <span className="text-gray-400 font-normal text-[11px]">قوالب جاهزة مخصصة</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {WHATSAPP_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.type;
                return (
                  <button
                    key={tmpl.type}
                    type="button"
                    onClick={() => handleTemplateChange(tmpl.type)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="p-1 rounded-lg bg-white border border-gray-100 shadow-2xs">
                        {getTemplateIcon(tmpl.type)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isSelected ? 'bg-emerald-200/60 text-emerald-900' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tmpl.badge}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-gray-900">{tmpl.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700">نص الرسالة (قابل للتعديل):</label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-emerald-700 font-medium cursor-pointer transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ النص</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans"
              placeholder="اكتب رسالتك هنا..."
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 hover:shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              <span>إرسال عبر واتساب</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
