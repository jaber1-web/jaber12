import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Send,
  Check,
  Bell,
  HeartHandshake,
  HelpCircle,
  Phone,
  Copy,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { EventAttendee, EventItem } from '../types';
import { useApp } from '../context/AppContext';
import {
  WhatsAppTemplateType,
  buildWhatsAppMessage,
  openWhatsAppChat,
  formatPhoneForWhatsApp,
} from '../utils/whatsappUtils';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  initialTarget?: 'absent' | 'present' | 'all';
}

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  event,
  initialTarget = 'absent',
}) => {
  const { settings } = useApp();

  const [targetCategory, setTargetCategory] = useState<'absent' | 'present' | 'all'>(initialTarget);
  const [openedPhones, setOpenedPhones] = useState<Set<string>>(new Set());
  const [copiedGeneral, setCopiedGeneral] = useState(false);

  if (!isOpen || !event) return null;

  const allAttendees = event.attendees || [];

  // Filter based on selected category
  const filteredAttendees = allAttendees.filter((a) => {
    if (targetCategory === 'absent') return a.status === 'absent';
    if (targetCategory === 'present') return a.status === 'present';
    return true; // 'all'
  });

  // Determine template type according to target category
  const templateType: WhatsAppTemplateType =
    targetCategory === 'absent'
      ? 'absent_inquiry'
      : targetCategory === 'present'
      ? 'thank_you'
      : 'reminder';

  const handleSendToAttendee = (attendee: EventAttendee) => {
    const phone = attendee.phone?.trim() || attendee.stcNumber?.trim() || '';
    if (!phone) return;

    const message = buildWhatsAppMessage({
      type: templateType,
      attendeeName: attendee.name,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      orgName: settings.orgName,
    });

    openWhatsAppChat(phone, message);

    // Track as opened
    setOpenedPhones((prev) => {
      const next = new Set(prev);
      next.add(attendee.personId);
      return next;
    });
  };

  const handleCopySampleText = async () => {
    const sample = buildWhatsAppMessage({
      type: templateType,
      attendeeName: '[اسم المشارك]',
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      orgName: settings.orgName,
    });
    await navigator.clipboard.writeText(sample);
    setCopiedGeneral(true);
    setTimeout(() => setCopiedGeneral(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">مراسلة المشاركين عبر واتساب</h3>
              <p className="text-emerald-100 text-xs mt-0.5 font-medium">{event.title}</p>
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

        {/* Category Tabs */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setTargetCategory('absent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetCategory === 'absent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-rose-700 hover:bg-rose-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>مراسلة الغائبين ❌</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {allAttendees.filter((a) => a.status === 'absent').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetCategory('present')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetCategory === 'present'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>شكر الحاضرين ✅</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {allAttendees.filter((a) => a.status === 'present').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>تذكير الجميع ⏰</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {allAttendees.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopySampleText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            {copiedGeneral ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            <span>{copiedGeneral ? 'تم النسخ!' : 'نسخ قالب الرسالة'}</span>
          </button>
        </div>

        {/* Message preview banner */}
        <div className="px-5 py-3 bg-emerald-50/50 border-b border-emerald-100 text-xs text-emerald-950 flex items-start gap-2.5">
          <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-emerald-900 ml-1">
              {targetCategory === 'absent'
                ? 'نموذج رسالة الاستفسار والاطمئنان على الغائبين:'
                : targetCategory === 'present'
                ? 'نموذج رسالة الشكر والتقدير للحاضرين:'
                : 'نموذج رسالة التذكير بموعد الفعالية:'}
            </span>
            <p className="text-gray-600 line-clamp-1 mt-0.5">
              {buildWhatsAppMessage({
                type: templateType,
                attendeeName: 'فلان',
                eventTitle: event.title,
                eventDate: event.date,
                eventLocation: event.location,
                orgName: settings.orgName,
              }).replace(/\n+/g, ' ')}
            </p>
          </div>
        </div>

        {/* Attendees List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {filteredAttendees.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 stroke-1 text-gray-300" />
              <p className="font-bold text-sm text-gray-600">لا يوجد مشاركون في هذا التصنيف</p>
              <p className="text-xs text-gray-400 mt-1">
                {targetCategory === 'absent'
                  ? 'رائع! لا يوجد أي غائب مسجل حتى الآن.'
                  : targetCategory === 'present'
                  ? 'لم يتم تحضير أي مشارك كحاضر حتى الآن.'
                  : 'لا يوجد مسجلين في الفعالية.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
                <span>المشاركون ({filteredAttendees.length})</span>
                <span>
                  تم فتح المراسلة لـ {openedPhones.size} من {filteredAttendees.length}
                </span>
              </div>

              {filteredAttendees.map((att, idx) => {
                const phone = att.phone?.trim() || att.stcNumber?.trim() || '';
                const hasValidPhone = Boolean(formatPhoneForWhatsApp(phone));
                const isOpened = openedPhones.has(att.personId);

                return (
                  <div
                    key={att.personId}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isOpened
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-white hover:bg-gray-50/80 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center font-mono text-xs text-gray-400">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 truncate">
                            {att.name}
                          </span>
                          {isOpened && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                              <Check className="w-3 h-3" />
                              تم الإرسال
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 font-mono" dir="ltr">
                          {phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {phone}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-sans text-[11px]">
                              ⚠️ لا يوجد رقم هاتف
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasValidPhone ? (
                        <button
                          type="button"
                          onClick={() => handleSendToAttendee(att)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs ${
                            isOpened
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          }`}
                          title={`إرسال واتساب إلى ${att.name}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isOpened ? 'إعادة الإرسال' : 'إرسال واتساب'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-lg">
                          غير متاح
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            💡 يتم فتح محادثة WhatsApp مباشرة مع كل شخص بالرسالة المخصصة باسمه
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
