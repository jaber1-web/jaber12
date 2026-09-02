import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  Building,
  Crown,
  Shield,
  Award,
  Users,
  Star,
  Flame,
  Sparkles,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { EventItem, LogoPreset } from '../types';
import { useApp } from '../context/AppContext';
import {
  getAttendanceStats,
  printOrSavePdf,
  exportToExcel,
  copyReportToClipboard,
  exportEventToPdf,
} from '../utils/exportUtils';
import { motion } from 'motion/react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const { settings } = useApp();
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Local overrides for instant preview tweaking
  const [showStats, setShowStats] = useState(settings.includeStatsInPrint);
  const [showStc, setShowStc] = useState(settings.includeStcInPrint);
  const [showLogo, setShowLogo] = useState(settings.showLogoInReports);

  const paperDocRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const stats = getAttendanceStats(event);
  const now = new Date().toLocaleString('ar-SA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const getCustomSettings = () => ({
    ...settings,
    includeSignaturesInPrint: false,
    includeStatsInPrint: showStats,
    includeStcInPrint: showStc,
    showLogoInReports: showLogo,
  });

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const customSettings = getCustomSettings();
      const ok = await exportEventToPdf(event, customSettings);

      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const customSettings = getCustomSettings();
      await printOrSavePdf(event, customSettings);
    } catch (err) {
      console.error('Print error:', err);
    } finally {
      setTimeout(() => setIsPrinting(false), 1200);
    }
  };

  const handleCopy = async () => {
    const ok = await copyReportToClipboard(event, settings);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderPresetIcon = (preset: LogoPreset) => {
    switch (preset) {
      case 'crown': return <Crown className="w-8 h-8 text-blue-600" />;
      case 'shield': return <Shield className="w-8 h-8 text-blue-600" />;
      case 'award': return <Award className="w-8 h-8 text-blue-600" />;
      case 'star': return <Star className="w-8 h-8 text-blue-600" />;
      case 'users': return <Users className="w-8 h-8 text-blue-600" />;
      case 'flame': return <Flame className="w-8 h-8 text-blue-600" />;
      case 'sparkles': return <Sparkles className="w-8 h-8 text-blue-600" />;
      case 'building':
      default:
        return <Building className="w-8 h-8 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden"
      >
        {/* Modal Top Toolbar */}
        <div className="p-3.5 sm:px-6 bg-gray-900 text-white flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                تقرير الحضور الرسمي (PDF وطباعة)
              </h3>
              <p className="text-xs text-gray-400">
                جاهز للتنزيل الفوري كـ PDF أو الطباعة المباشرة على A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="pdf-modal-download-btn-top"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="تنزيل ملف PDF مباشرة لجهازك"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? 'جاري التحميل...' : downloadSuccess ? 'تم التحميل!' : 'تحميل PDF'}</span>
            </button>

            <button
              type="button"
              id="pdf-modal-direct-print-btn-top"
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{isPrinting ? 'جاري الفتح...' : 'طباعة'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Customization Toolbar */}
        <div className="bg-gray-100/90 border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs font-semibold">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 font-bold">خيارات العرض:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-black">
              <input
                type="checkbox"
                checked={showLogo}
                onChange={e => setShowLogo(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>الشعار</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-black">
              <input
                type="checkbox"
                checked={showStats}
                onChange={e => setShowStats(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>الملخص</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-black">
              <input
                type="checkbox"
                checked={showStc}
                onChange={e => setShowStc(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>رقم STC</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-gray-700 hover:text-blue-600 flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-gray-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
            </button>
            <button
              type="button"
              onClick={() => exportToExcel(event, settings)}
              className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Paper Document Preview Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-gray-200/70 flex justify-center">
          <div
            id="pdf-printable-document"
            ref={paperDocRef}
            className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-gray-300 p-5 sm:p-8 font-sans space-y-4 text-[#1A1A1A]"
          >
            {/* Header Letterhead */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-blue-600 gap-4">
              <div className="flex items-center gap-3">
                {showLogo && (
                  settings.logoType === 'custom' && settings.customLogoUrl ? (
                    <img
                      src={settings.customLogoUrl}
                      alt="Logo"
                      className="max-h-10 max-w-[100px] object-contain rounded-md"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      {renderPresetIcon(settings.presetIcon)}
                    </div>
                  )
                )}
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-gray-900">
                    {settings.orgName || 'كشف حضور الفعالية'}
                  </h1>
                  {settings.orgSubtitle && (
                    <p className="text-xs text-gray-500 font-medium">
                      {settings.orgSubtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-left font-mono text-[10.5px] text-gray-500 shrink-0">
                <span className="block font-bold text-gray-800 text-xs font-sans">
                  {settings.printHeaderTitle}
                </span>
                <span>{now}</span>
              </div>
            </div>

            {/* Event Info Banner */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
                  {event.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5 flex-wrap">
                  <span>📅 التاريخ: <strong className="text-gray-900">{event.date}</strong></span>
                  {event.location && (
                    <span>📍 الموقع: <strong className="text-gray-900">{event.location}</strong></span>
                  )}
                </div>
              </div>
              <div className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-mono font-bold text-xs self-start sm:self-auto">
                نسبة الحضور: {stats.presentPct}%
              </div>
            </div>

            {/* Stats Summary Cards */}
            {showStats && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white p-2 rounded-lg border border-gray-200 text-center font-mono">
                  <span className="block text-[10px] text-gray-500 font-sans">إجمالي المسجلين</span>
                  <span className="text-sm font-bold text-gray-800">{stats.total}</span>
                </div>
                <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 text-center font-mono">
                  <span className="block text-[10px] text-emerald-700 font-sans">حاضر</span>
                  <span className="text-sm font-bold text-emerald-700">{stats.present} ({stats.presentPct}%)</span>
                </div>
                <div className="bg-rose-50/80 p-2 rounded-lg border border-rose-200 text-center font-mono">
                  <span className="block text-[10px] text-rose-700 font-sans">غائب</span>
                  <span className="text-sm font-bold text-rose-700">{stats.absent} ({stats.absentPct}%)</span>
                </div>
                <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-200 text-center font-mono">
                  <span className="block text-[10px] text-amber-700 font-sans">معلق</span>
                  <span className="text-sm font-bold text-amber-700">{stats.pending}</span>
                </div>
              </div>
            )}

            {/* Attendees Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-2.5 py-2 text-center w-8">م</th>
                    <th className="px-2.5 py-2">الاسم الكامل</th>
                    <th className="px-2.5 py-2 text-center w-20">الحالة</th>
                    <th className="px-2.5 py-2 text-left font-mono">رقم الجوال</th>
                    {showStc && <th className="px-2.5 py-2 text-left font-mono">رقم STC</th>}
                    {settings.includeEmailInPrint && <th className="px-2.5 py-2 text-left font-mono">البريد الإلكتروني</th>}
                    <th className="px-2.5 py-2 text-center font-mono w-16">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(!event?.attendees || event.attendees.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-gray-400">
                        لا يوجد مشاركين مسجلين في هذا الكشف
                      </td>
                    </tr>
                  ) : (
                    event.attendees.map((attendee, index) => {
                      const isPresent = attendee.status === 'present';
                      const isAbsent = attendee.status === 'absent';
                      return (
                        <tr key={attendee.personId} className={isPresent ? 'bg-emerald-50/20' : isAbsent ? 'bg-rose-50/20' : ''}>
                          <td className="px-2.5 py-1.5 text-center text-gray-400 font-mono text-[11px]">{index + 1}</td>
                          <td className="px-2.5 py-1.5 font-bold text-gray-900">{attendee.name}</td>
                          <td className="px-2.5 py-1.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPresent ? 'bg-emerald-100 text-emerald-800' :
                              isAbsent ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {isPresent ? 'حاضر' : isAbsent ? 'غائب' : 'معلق'}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-left font-mono text-gray-600" dir="ltr">{attendee.phone || '-'}</td>
                          {showStc && (
                            <td className="px-2.5 py-1.5 text-left font-mono text-gray-600" dir="ltr">{attendee.stcNumber || '-'}</td>
                          )}
                          {settings.includeEmailInPrint && (
                            <td className="px-2.5 py-1.5 text-left font-mono text-gray-500" dir="ltr">{attendee.email || '-'}</td>
                          )}
                          <td className="px-2.5 py-1.5 text-center font-mono text-gray-500 text-[10.5px]">
                            {attendee.markedAt ? new Date(attendee.markedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Minimalist Footer */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
              <span>{settings.orgName}</span>
              <span>تاريخ الاستخراج: {now}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              id="pdf-modal-download-btn-bottom"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? 'جاري تجهيز PDF...' : downloadSuccess ? 'تم تحميل PDF بنجاح!' : 'تحميل ملف PDF'}</span>
            </button>

            <button
              type="button"
              id="pdf-modal-direct-print-btn-bottom"
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{isPrinting ? 'جاري إرسال أمر الطباعة...' : 'طباعة التقرير'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
