import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Check,
  X,
  Filter,
  Printer,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventItem, EventAttendee, AttendanceStatus } from '../types';
import { getAttendanceStats, exportToExcel, printOrSavePdf } from '../utils/exportUtils';
import { playAttendanceFeedback } from '../utils/storage';

interface AttendanceViewProps {
  event: EventItem;
  onBack: () => void;
  onUpdateAttendeeStatus: (personId: string, status: AttendanceStatus) => void;
  onOpenAddAttendeeModal: () => void;
  onOpenEditAttendeeModal: (attendee: EventAttendee) => void;
  onRemoveAttendee: (personId: string) => void;
  onOpenReportModal: () => void;
  onBatchSetStatus: (status: AttendanceStatus) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  event,
  onBack,
  onUpdateAttendeeStatus,
  onOpenAddAttendeeModal,
  onOpenEditAttendeeModal,
  onRemoveAttendee,
  onOpenReportModal,
  onBatchSetStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'pending'>('all');
  const [lastActionPerson, setLastActionPerson] = useState<{ name: string; status: AttendanceStatus } | null>(null);

  const stats = useMemo(() => getAttendanceStats(event), [event]);
  const attendeesList = event?.attendees || [];

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return attendeesList.filter(a => {
      // Status filter
      if (statusFilter !== 'all' && a.status !== statusFilter) {
        return false;
      }
      // Query filter
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.phone && a.phone.includes(q)) ||
        (a.stcNumber && a.stcNumber.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
      );
    });
  }, [attendeesList, searchQuery, statusFilter]);

  const handleStatusChange = (personId: string, name: string, status: AttendanceStatus) => {
    playAttendanceFeedback(status === 'present' ? 'present' : 'absent');
    onUpdateAttendeeStatus(personId, status);
    setLastActionPerson({ name, status });

    if (status === 'present' && stats.present + 1 === stats.total && stats.total > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {}
    }

    setTimeout(() => {
      setLastActionPerson(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb with Back Action */}
      <div className="flex items-center justify-between gap-2">
        <button
          id="breadcrumb-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-blue-600 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          <ArrowRight className="w-4 h-4 text-blue-600" />
          <span>رجوع إلى قائمة الفعاليات</span>
        </button>

        <span className="text-xs text-gray-500 font-medium hidden sm:inline-block">
          لوحة تحضير: <strong className="text-gray-800">{event.title}</strong>
        </span>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Back & Title */}
          <div className="flex items-start sm:items-center gap-3.5">
            <button
              id="back-to-events-btn"
              onClick={onBack}
              className="px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold shrink-0 shadow-2xs active:scale-95 cursor-pointer"
              title="الرجوع لقائمة الفعاليات"
            >
              <ArrowRight className="w-4 h-4 text-gray-700" />
              <span>رجوع</span>
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
                  {event.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  لوحة التحضير
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                <span>📅 {event.date}</span>
                {event.location && <span>• 📍 {event.location}</span>}
                {event.notes && <span className="hidden lg:inline">• 📝 {event.notes}</span>}
              </div>
            </div>
          </div>

          {/* Quick Export & Send Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="quick-excel-export-btn"
              onClick={() => exportToExcel(event)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium transition-colors"
              title="تصدير سريع إلى Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>Excel</span>
            </button>

            <button
              id="quick-print-pdf-btn"
              onClick={printOrSavePdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium transition-colors"
              title="طباعة تقرير PDF"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline">طباعة PDF</span>
            </button>

            <button
              id="send-report-to-manager-btn"
              onClick={onOpenReportModal}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-black hover:bg-gray-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>إرسال التقرير للمسؤول</span>
            </button>
          </div>
        </div>

        {/* Main Stats Summary */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-gray-100">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي المسجلين</p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-green-600 text-xs mb-1 font-medium">تم التحضير ✅</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold font-mono text-green-600">{stats.present}</p>
              <span className="text-xs font-bold text-green-600 font-mono">({stats.presentPct}%)</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-red-500 text-xs mb-1 font-medium">لم يحضروا ❌</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold font-mono text-red-500">{stats.absent}</p>
              <span className="text-xs font-bold text-red-500 font-mono">({stats.absentPct}%)</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-blue-600 text-xs mb-1 font-medium">نسبة الحضور</p>
            <p className="text-2xl font-bold font-mono text-blue-600">{stats.presentPct}%</p>
          </div>
        </section>
      </div>

      {/* Action Notification Pill when marked */}
      {lastActionPerson && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border border-gray-700 animate-in fade-in slide-in-from-bottom duration-150">
          {lastActionPerson.status === 'present' ? (
            <span className="flex items-center gap-1.5 text-green-400">
              <Check className="w-4 h-4" />
              تم تسجيل <strong>{lastActionPerson.name}</strong> كـ حاضر ✅
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-400">
              <X className="w-4 h-4" />
              تم تسجيل <strong>{lastActionPerson.name}</strong> كـ لم يحضر ❌
            </span>
          )}
        </div>
      )}

      {/* Attendance Tool Area & Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Search & Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              id="attendance-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الإيميل، رقم الجوال أو جوال STC..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                مسح
              </button>
            )}
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Add person */}
            <button
              type="button"
              id="open-add-person-btn"
              onClick={onOpenAddAttendeeModal}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-gray-600" />
              <span>+ إضافة شخص جديد</span>
            </button>

            {/* Batch actions menu */}
            {attendeesList.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                <button
                  type="button"
                  id="batch-mark-all-present-btn"
                  onClick={() => onBatchSetStatus('present')}
                  className="px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
                  title="تحضير الكل كـ حاضر"
                >
                  تحضير الكل ✅
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  id="batch-reset-status-btn"
                  onClick={() => onBatchSetStatus('pending')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                  title="تصفير حالة التحضير"
                >
                  إعادة تعيين
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border-b border-gray-100 bg-white overflow-x-auto">
          <span className="text-xs font-medium text-gray-500 ml-2 shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            تصفية:
          </span>
          <button
            type="button"
            id="filter-all-btn"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#1A1A1A] text-white font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            الكل ({attendeesList.length})
          </button>
          <button
            type="button"
            id="filter-present-btn"
            onClick={() => setStatusFilter('present')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'present'
                ? 'bg-green-600 text-white'
                : 'text-green-700 hover:bg-green-50'
            }`}
          >
            حاضر ({stats.present})
          </button>
          <button
            type="button"
            id="filter-absent-btn"
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'absent'
                ? 'bg-red-500 text-white'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            لم يحضر ({stats.absent})
          </button>
          <button
            type="button"
            id="filter-pending-btn"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            معلّق ({stats.pending})
          </button>
        </div>

        {/* Actual Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-bold border-b border-gray-100">
                <th className="px-6 py-3.5 border-b border-gray-100 w-12 text-center">م</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[180px]">الاسم الكامل</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[280px] text-center w-[280px]">حالة الحضور</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[140px]">رقم الجوال</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[140px]">رقم جوال STC</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[180px] hidden md:table-cell">البريد الإلكتروني</th>
                <th className="px-6 py-3.5 border-b border-gray-100 w-24 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50 bg-white">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="max-w-xs mx-auto space-y-3">
                      <Users className="w-10 h-10 mx-auto text-gray-300" />
                      <p className="text-sm font-medium text-gray-600">
                        {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد أشخاص مسجلين في هذا الإيفنت حتى الآن'}
                      </p>
                      <button
                        type="button"
                        onClick={onOpenAddAttendeeModal}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        + إضافة أشخاص الآن
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((attendee, index) => {
                  const isPresent = attendee.status === 'present';
                  const isAbsent = attendee.status === 'absent';

                  return (
                    <tr
                      key={attendee.personId}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isPresent
                          ? 'bg-green-50/20'
                          : isAbsent
                          ? 'bg-red-50/15'
                          : index % 2 === 1
                          ? 'bg-gray-50/30'
                          : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="px-6 py-4 text-center font-mono text-xs text-gray-400 font-semibold">
                        {index + 1}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#1A1A1A]">
                          {attendee.name}
                        </div>
                        <div className="text-[11px] text-gray-400 md:hidden flex items-center gap-2 mt-0.5" dir="ltr">
                          <span>{attendee.phone}</span>
                          {attendee.stcNumber && (
                            <span className="font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-sm">STC: {attendee.stcNumber}</span>
                          )}
                        </div>
                      </td>

                      {/* Clean Utility Attendance Buttons */}
                      <td className="px-6 py-2">
                        <div className="flex gap-2 justify-center">
                          {/* Present Button */}
                          <button
                            type="button"
                            id={`attendee-present-btn-${attendee.personId}`}
                            onClick={() => handleStatusChange(attendee.personId, attendee.name, 'present')}
                            className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer ${
                              isPresent
                                ? 'bg-green-500 text-white shadow-sm ring-1 ring-green-600'
                                : 'border border-gray-200 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                            }`}
                          >
                            <span>{isPresent ? '✅ حاضر' : 'حاضر'}</span>
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            id={`attendee-absent-btn-${attendee.personId}`}
                            onClick={() => handleStatusChange(attendee.personId, attendee.name, 'absent')}
                            className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer ${
                              isAbsent
                                ? 'bg-red-500 text-white shadow-sm ring-1 ring-red-600'
                                : 'border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                            }`}
                          >
                            <span>{isAbsent ? '❌ لم يحضر' : 'لم يحضر'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-600 text-left" dir="ltr">
                        <div className="flex items-center justify-start gap-1.5">
                          <a
                            href={`tel:${attendee.phone}`}
                            className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="اتصال مباشر"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <span>{attendee.phone || '-'}</span>
                        </div>
                      </td>

                      {/* STC Number */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-600 text-left" dir="ltr">
                        <div className="flex items-center justify-start gap-1.5">
                          {attendee.stcNumber && (
                            <a
                              href={`tel:${attendee.stcNumber}`}
                              className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="اتصال مباشر برقم STC"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <span>{attendee.stcNumber || '-'}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-500 hidden md:table-cell font-mono text-xs text-left" dir="ltr">
                        {attendee.email ? (
                          <div className="flex items-center gap-1 truncate max-w-[200px]" title={attendee.email}>
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{attendee.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            id={`edit-attendee-${attendee.personId}`}
                            onClick={() => onOpenEditAttendeeModal(attendee)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                            title="تعديل بيانات الشخص"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`remove-attendee-${attendee.personId}`}
                            onClick={() => onRemoveAttendee(attendee.personId)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف من هذا الإيفنت"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            <span>إجمالي المعروض: <strong className="text-[#1A1A1A]">{filteredAttendees.length}</strong> من أصل <strong className="text-[#1A1A1A]">{attendeesList.length}</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              <span>حاضر: <strong className="text-green-700 font-mono">{stats.present}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              <span>لم يحضر: <strong className="text-red-600 font-mono">{stats.absent}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              <span>معلّق: <strong className="text-amber-700 font-mono">{stats.pending}</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <footer className="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            id="bottom-back-to-events-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-gray-600" />
            <span>رجوع للفعاليات</span>
          </button>

          <p className="text-xs text-gray-500 hidden md:block">
            تم التحديث فوراً • حفظ السجلات تلقائي
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => exportToExcel(event)}
            className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500 border border-gray-200 transition-colors"
            title="تصدير إكسل"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={printOrSavePdf}
            className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500 border border-gray-200 transition-colors"
            title="طباعة PDF"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="bg-black text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:bg-gray-800 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>إرسال التقرير</span>
            <span>📤</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
