import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Printer,
  Send,
  Copy,
  Check,
  ChevronLeft,
  ArrowRight,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAttendanceStats,
  exportToExcel,
  printOrSavePdf,
  shareViaWhatsApp,
  copyReportToClipboard,
  generateTextReport,
} from '../utils/exportUtils';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { events, settings, setPdfModalEvent } = useApp();

  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [copied, setCopied] = useState(false);

  const currentEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || events[0];
  }, [events, selectedEventId]);

  const stats = useMemo(() => {
    if (!currentEvent) return null;
    return getAttendanceStats(currentEvent);
  }, [currentEvent]);

  // Overall system metrics across all events
  const systemMetrics = useMemo(() => {
    let totalInvited = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    (events || []).forEach(e => {
      const attendees = e?.attendees || [];
      totalInvited += attendees.length;
      totalPresent += attendees.filter(a => a?.status === 'present').length;
      totalAbsent += attendees.filter(a => a?.status === 'absent').length;
    });

    const averageRate = totalInvited > 0 ? Math.round((totalPresent / totalInvited) * 100) : 0;

    return {
      totalEvents: (events || []).length,
      totalInvited,
      totalPresent,
      totalAbsent,
      averageRate,
    };
  }, [events]);

  const handleCopy = async () => {
    if (!currentEvent) return;
    const ok = await copyReportToClipboard(currentEvent, settings);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };


  const handleExportAllEventsExcel = () => {
    const rows: any[] = [];
    (events || []).forEach((evt) => {
      (evt?.attendees || []).forEach((att) => {
        rows.push({
          'م': rows.length + 1,
          'اسم الفعالية': evt.title,
          'تاريخ الفعالية': evt.date,
          'مكان الفعالية': evt.location || '-',
          'اسم المشارك': att.name,
          'حالة الحضور': att.status === 'present' ? 'حاضر ✅' : att.status === 'absent' ? 'غائب ❌' : 'معلق ⏳',
          'رقم الجوال': att.phone || '-',
          'رقم جوال STC': att.stcNumber || '-',
          'البريد الإلكتروني': att.email || '-',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير شامل لجميع الفعاليات');
    XLSX.writeFile(workbook, `تقرير_شامل_لجميع_الفعاليات_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-20"
    >
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500">
          <Link
            to="/events"
            className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
          >
            <span>الفعاليات</span>
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[#1A1A1A] font-bold">صفحة التقارير والإحصائيات</span>
        </div>

        <button
          id="reports-breadcrumb-back-btn"
          onClick={() => navigate('/events')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-blue-600 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          <ArrowRight className="w-4 h-4 text-blue-600" />
          <span>رجوع إلى قائمة الفعاليات</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
                مركز التقارير والإحصائيات
              </h2>
              <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-bold border border-blue-100">
                تصدير ومشاركة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              استخراج تقارير الحضور الجاهزة للمسؤولين بصيغ WhatsApp و Excel و PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportAllEventsExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>تصدير تقرير شامل (Excel)</span>
          </button>
        </div>
      </div>

      {/* System KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي الفعاليات</p>
          <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{systemMetrics.totalEvents}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي الحضور الفعلي</p>
          <p className="text-2xl font-bold font-mono text-emerald-600">{systemMetrics.totalPresent}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي الغياب</p>
          <p className="text-2xl font-bold font-mono text-rose-600">{systemMetrics.totalAbsent}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs mb-1 font-medium">متوسط نسبة الحضور</p>
          <p className="text-2xl font-bold font-mono text-blue-600">{systemMetrics.averageRate}%</p>
        </div>
      </div>

      {/* Single Event Report Selector & Viewer */}
      {(events || []).length > 0 && currentEvent && stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Event Picker */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#1A1A1A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>اختر الفعالية المراد استعراضها</span>
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {events.map(e => {
                const s = getAttendanceStats(e);
                const isSelected = e.id === currentEvent.id;

                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedEventId(e.id)}
                    className={`w-full text-right p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-gray-50/50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-bold text-sm truncate ${isSelected ? 'text-blue-900' : 'text-[#1A1A1A]'}`}>
                        {e.title}
                      </p>
                      <span className="font-mono text-xs font-bold text-emerald-600 shrink-0">
                        {s.presentPct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1.5 font-mono">
                      <span>📅 {e.date}</span>
                      <span>{s.present} حاضر من {s.total}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle & Right Column: Event Report Details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-bold text-[#1A1A1A]">{currentEvent.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    📅 التاريخ: {currentEvent.date} {currentEvent.location ? `• 📍 ${currentEvent.location}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => shareViaWhatsApp(currentEvent, settings)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال واتساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportToExcel(currentEvent, settings)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Excel</span>
                  </button>

                  <button
                    type="button"
                    id="reports-open-pdf-btn"
                    onClick={() => setPdfModalEvent(currentEvent)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-blue-600" />
                    <span>معاينة وطباعة PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/events/${currentEvent.id}`)}
                    className="bg-[#1A1A1A] hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>صفحة التحضير</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>

              </div>

              {/* Event Rate Breakdown */}
              <div className="grid grid-cols-4 gap-3 my-5">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center font-mono">
                  <span className="block text-[11px] text-gray-500 font-sans">المدعوين</span>
                  <span className="text-base font-bold text-gray-800">{stats.total}</span>
                </div>
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-center font-mono">
                  <span className="block text-[11px] text-emerald-700 font-sans">حاضر</span>
                  <span className="text-base font-bold text-emerald-700">{stats.present}</span>
                </div>
                <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100 text-center font-mono">
                  <span className="block text-[11px] text-rose-700 font-sans">غائب</span>
                  <span className="text-base font-bold text-rose-700">{stats.absent}</span>
                </div>
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-center font-mono">
                  <span className="block text-[11px] text-blue-700 font-sans">نسبة الحضور</span>
                  <span className="text-base font-bold text-blue-700">{stats.presentPct}%</span>
                </div>
              </div>

              {/* Text Report Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">معاينة نص التقرير (جاهز للنسخ والإرسال)</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">تم النسخ بنجاح!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ النص</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed text-gray-800 max-h-72 overflow-y-auto">
                  {generateTextReport(currentEvent, settings)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center shadow-sm">
          <p className="text-gray-500 font-semibold">لا توجد فعاليات لعرض تقاريرها حالياً</p>
        </div>
      )}
    </motion.div>
  );
};
