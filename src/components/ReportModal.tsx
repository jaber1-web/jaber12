import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Send,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
} from 'lucide-react';
import { EventItem } from '../types';
import { useApp } from '../context/AppContext';
import {
  getAttendanceStats,
  generateTextReport,
  shareViaWhatsApp,
  shareViaEmail,
  copyReportToClipboard,
  exportToExcel,
  printOrSavePdf,
} from '../utils/exportUtils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const { settings, setPdfModalEvent } = useApp();
  const [copied, setCopied] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'pending'>('all');

  if (!isOpen || !event) return null;

  const stats = getAttendanceStats(event);

  const handleCopy = async () => {
    const success = await copyReportToClipboard(event, settings);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const displayedAttendees = (event?.attendees || []).filter(a => {
    if (filterStatus === 'all') return true;
    return a?.status === filterStatus;
  });

  const handleOpenPdf = () => {
    setPdfModalEvent(event);
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">تقرير حضور الفعالية للمسؤول</h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-xs font-medium">
                  جاهز للإرسال
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {event.title} • {event.date}
              </p>
            </div>
          </div>
          <button
            id="close-report-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* WhatsApp Direct */}
            <button
              type="button"
              id="report-share-whatsapp-btn"
              onClick={() => shareViaWhatsApp(event, settings)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-medium shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال واتساب للمسؤول</span>
            </button>

            {/* Excel Download */}
            <button
              type="button"
              id="report-export-excel-btn"
              onClick={() => exportToExcel(event, settings)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-lg text-xs font-medium shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير Excel (.xlsx)</span>
            </button>

            {/* PDF / Print */}
            <button
              type="button"
              id="report-print-pdf-btn"
              onClick={handleOpenPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>معاينة وطباعة PDF</span>
            </button>

            {/* Email */}
            <button
              type="button"
              id="report-share-email-btn"
              onClick={() => shareViaEmail(event, settings)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-gray-500" />
              <span>إيميل</span>
            </button>

          </div>

          {/* Copy text button */}
          <button
            type="button"
            id="report-copy-text-btn"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-[#1A1A1A] hover:bg-black text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>تم نسخ التقرير!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ كنص جاهز</span>
              </>
            )}
          </button>
        </div>

        {/* Scrollable Report Content */}
        <div id="printable-report-content" className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#1A1A1A]">{event.title}</h3>
                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3 mt-1 font-medium">
                  <span>📅 التاريخ: {event.date}</span>
                  {event.location && <span>📍 الموقع: {event.location}</span>}
                </div>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-gray-400 block">وقت الاستخراج</span>
                <span className="text-xs font-medium text-gray-600 font-mono">
                  {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {/* Total */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 block font-medium">إجمالي المسجلين</span>
                  <span className="text-lg font-bold text-[#1A1A1A] font-mono">{stats.total}</span>
                </div>
              </div>

              {/* Present */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-800 block font-medium">الحاضرين</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-emerald-700 font-mono">{stats.present}</span>
                    <span className="text-xs font-semibold text-emerald-600 font-mono">({stats.presentPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Absent */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-red-800 block font-medium">لم يحضروا</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-red-700 font-mono">{stats.absent}</span>
                    <span className="text-xs font-semibold text-red-600 font-mono">({stats.absentPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-800 block font-medium">معلّق / لم يسجل</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-amber-700 font-mono">{stats.pending}</span>
                    <span className="text-xs font-semibold text-amber-600 font-mono">({stats.pendingPct}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Progress Bar */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                <span className="font-medium">نسبة الحضور الإجمالية</span>
                <span className="font-bold font-mono text-emerald-700">{stats.presentPct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${stats.presentPct}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                />
                <div
                  style={{ width: `${stats.absentPct}%` }}
                  className="bg-red-500 h-full transition-all duration-300"
                />
                <div
                  style={{ width: `${stats.pendingPct}%` }}
                  className="bg-amber-400 h-full transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Attendees List in Report */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <span>قائمة الحضور التفصيلية</span>
                <span className="text-xs font-normal text-gray-500">({displayedAttendees.length} شخص)</span>
              </h4>

              {/* Status Filter for Report View */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'all' ? 'bg-white font-bold text-[#1A1A1A] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  الكل ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('present')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'present' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-600 hover:text-emerald-700'
                  }`}
                >
                  حاضر ({stats.present})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('absent')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'absent' ? 'bg-red-600 text-white font-bold' : 'text-gray-600 hover:text-red-700'
                  }`}
                >
                  لم يحضر ({stats.absent})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10">م</th>
                    <th className="py-2.5 px-3">الاسم</th>
                    <th className="py-2.5 px-3 text-center">حالة الحضور</th>
                    <th className="py-2.5 px-3">رقم الجوال</th>
                    <th className="py-2.5 px-3">رقم جوال STC</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">البريد الإلكتروني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500 text-xs">
                        لا يوجد أشخاص مسجلين بهذه الحالة
                      </td>
                    </tr>
                  ) : (
                    displayedAttendees.map((a, idx) => (
                      <tr key={a.personId + idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-gray-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#1A1A1A]">{a.name}</td>
                        <td className="py-2.5 px-3 text-center">
                          {a.status === 'present' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                              <span>حاضر ✅</span>
                            </span>
                          ) : a.status === 'absent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <X className="w-3.5 h-3.5" />
                              <span>لم يحضر ❌</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              معلّق ⏳
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600 text-left" dir="ltr">
                          {a.phone}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600 text-left" dir="ltr">
                          {a.stcNumber || '-'}
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell text-gray-500 text-left font-mono" dir="ltr">
                          {a.email || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Preview of Text Report */}
          <div className="bg-[#1A1A1A] text-gray-200 p-4 rounded-xl text-xs font-mono space-y-2 relative">
            <div className="flex items-center justify-between text-gray-400 pb-2 border-b border-gray-800">
              <span className="font-sans font-medium text-gray-300">معاينة النص الجاهز للإرسال للمسؤول:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-sans font-medium cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs text-gray-300 max-h-36 overflow-y-auto leading-relaxed">
              {generateTextReport(event)}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            جاهز للمشاركة والمراسلة الفورية
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            إغلاق التقرير
          </button>
        </div>
      </div>
    </div>
  );
};
