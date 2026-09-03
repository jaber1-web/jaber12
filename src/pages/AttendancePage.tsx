import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Share2,
  Trash2,
  Edit2,
  ArrowRight,
  Phone,
  Mail,
  FileSpreadsheet,
  Printer,
  Send,
  Sparkles,
  LayoutGrid,
  List,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AttendanceStatus, EventAttendee } from '../types';
import {
  getAttendanceStats,
  exportToExcel,
  printOrSavePdf,
  shareViaWhatsApp,
} from '../utils/exportUtils';
import { AddAttendeeModal } from '../components/AddAttendeeModal';
import { EditAttendeeModal } from '../components/EditAttendeeModal';
import { WhatsAppMessageModal } from '../components/WhatsAppMessageModal';
import { BulkWhatsAppModal } from '../components/BulkWhatsAppModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { AttendanceRoundsBar } from '../components/AttendanceRoundsBar';
import { NewRoundModal } from '../components/NewRoundModal';
import { MultiRoundMatrixModal } from '../components/MultiRoundMatrixModal';

export const AttendancePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const {
    getEventById,
    persons,
    settings,
    updateAttendeeStatus,
    markAllAttendees,
    addAttendeeToEvent,
    addMultipleAttendeesToEvent,
    addExistingPersonsToEvent,
    removeAttendeeFromEvent,
    editAttendeeInEvent,
    setReportModalEvent,
    setPdfModalEvent,
    createAttendanceRound,
    deleteAttendanceRound,
    renameAttendanceRound,
    setActiveAttendanceRound,
    updateAttendeeRoundStatus,
    markAllRoundAttendees,
  } = useApp();

  const event = eventId ? getEventById(eventId) : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'pending'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<EventAttendee | null>(null);
  const [attendeeToRemove, setAttendeeToRemove] = useState<{ personId: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [whatsAppAttendee, setWhatsAppAttendee] = useState<EventAttendee | null>(null);
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);
  const [bulkWhatsAppTarget, setBulkWhatsAppTarget] = useState<'absent' | 'present' | 'all'>('absent');

  // Periodic Attendance Rounds State
  const [isNewRoundModalOpen, setIsNewRoundModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isFilteringDropouts, setIsFilteringDropouts] = useState(false);

  const rounds = event?.rounds || [];
  const activeRoundId = event?.activeRoundId || (rounds.length > 0 ? rounds[rounds.length - 1]?.id : undefined);
  const activeRoundIndex = rounds.findIndex((r) => r.id === activeRoundId);

  // Identify attendees who dropped out (present in previous round, absent now)
  const dropoutsSet = useMemo(() => {
    if (activeRoundIndex <= 0 || !rounds[activeRoundIndex]) return new Set<string>();
    const activeRound = rounds[activeRoundIndex];
    const prevRounds = rounds.slice(0, activeRoundIndex);
    const set = new Set<string>();
    (event?.attendees || []).forEach((att) => {
      const isAbsentNow = (activeRound.records[att.personId] || att.status) === 'absent';
      const wasPresentBefore = prevRounds.some(
        (pr) => pr.records && pr.records[att.personId] === 'present'
      );
      if (isAbsentNow && wasPresentBefore) {
        set.add(att.personId);
      }
    });
    return set;
  }, [rounds, activeRoundIndex, event?.attendees]);

  const filteredAttendees = useMemo(() => {
    const attendees = event?.attendees || [];
    return attendees.filter(attendee => {
      const matchesSearch =
        (attendee?.name && attendee.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (attendee?.phone && attendee.phone.includes(searchQuery)) ||
        (attendee?.stcNumber && attendee.stcNumber.includes(searchQuery)) ||
        (attendee?.email && attendee.email.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter by dropouts if active
      if (isFilteringDropouts && !dropoutsSet.has(attendee.personId)) {
        return false;
      }

      if (filterStatus === 'all') return true;
      return attendee?.status === filterStatus;
    });
  }, [event?.attendees, searchQuery, filterStatus, isFilteringDropouts, dropoutsSet]);

  if (!event) {
    return (
      <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-200 shadow-sm">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-bold mb-2">لم يتم العثور على الفعالية</h2>
        <p className="text-gray-500 text-sm mb-6">
          قد تكون الفعالية قد حذفت أو أن الرابط غير صحيح.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة الفعاليات</span>
        </Link>
      </div>
    );
  }

  const stats = getAttendanceStats(event);

  const handleStatusClick = (personId: string, newStatus: AttendanceStatus) => {
    if (rounds.length > 0 && activeRoundId) {
      updateAttendeeRoundStatus(event.id, activeRoundId, personId, newStatus);
    } else {
      updateAttendeeStatus(event.id, personId, newStatus);
    }

    if (newStatus === 'present' && settings.confettiEnabled) {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.8 },
      });
    }
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (rounds.length > 0 && activeRoundId) {
      markAllRoundAttendees(event.id, activeRoundId, status);
    } else {
      markAllAttendees(event.id, status);
    }

    if (status === 'present' && settings.confettiEnabled) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 pb-24 sm:pb-20"
    >
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-500 overflow-hidden">
          <Link
            to="/events"
            className="hover:text-blue-600 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>الفعاليات</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-[#1A1A1A] font-bold truncate max-w-[180px] sm:max-w-[280px]">
            {event.title}
          </span>
        </div>

        <button
          id="breadcrumb-back-to-events-btn"
          onClick={() => navigate('/events')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-blue-600 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
          <span>كل الفعاليات</span>
        </button>
      </div>

      {/* Main Event Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-bold text-[#1A1A1A]">
                  {event.title}
                </h2>
                <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-mono font-bold border border-blue-100">
                  {event.date}
                </span>
              </div>
              {event.location && (
                <p className="text-xs text-gray-500 mt-1">📍 {event.location}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="add-attendee-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شخص</span>
            </button>

            <button
              type="button"
              id="attendance-pdf-preview-btn"
              onClick={() => setPdfModalEvent(event)}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">طباعة</span>
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setReportModalEvent(event)}
              className="bg-gray-100 text-gray-800 hover:bg-gray-200 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>

            <button
              type="button"
              id="attendance-whatsapp-bulk-btn"
              onClick={() => {
                setBulkWhatsAppTarget(stats.absent > 0 ? 'absent' : 'all');
                setIsBulkWhatsAppOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 hover:shadow-emerald-600/20"
              title="مراسلة المشاركين عبر واتساب"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">مراسلة</span>
              <span>واتساب</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-5 pt-4 border-t border-gray-100">
          <div className="bg-gray-50/80 p-3 sm:p-4 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-[11px] sm:text-xs mb-1 font-medium">المدعوون</p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#1A1A1A]">{stats.total}</p>
          </div>

          <div className="bg-emerald-50/70 p-3 sm:p-4 rounded-xl border border-emerald-100">
            <p className="text-emerald-700 text-[11px] sm:text-xs mb-1 font-medium">الحاضرين</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">{stats.present}</p>
              <span className="text-[10px] sm:text-xs text-emerald-600 font-mono font-bold">({stats.presentPct}%)</span>
            </div>
          </div>

          <div className="bg-rose-50/70 p-3 sm:p-4 rounded-xl border border-rose-100">
            <p className="text-rose-700 text-[11px] sm:text-xs mb-1 font-medium">الغياب</p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-rose-700">{stats.absent}</p>
          </div>

          <div className="bg-amber-50/70 p-3 sm:p-4 rounded-xl border border-amber-100">
            <p className="text-amber-700 text-[11px] sm:text-xs mb-1 font-medium">لم يسجل</p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Periodic Attendance Rounds Control Bar */}
      <AttendanceRoundsBar
        event={event}
        activeRoundId={activeRoundId}
        onSelectRound={(roundId) => setActiveAttendanceRound(event.id, roundId)}
        onOpenNewRoundModal={() => setIsNewRoundModalOpen(true)}
        onOpenMatrixModal={() => setIsMatrixModalOpen(true)}
        onRenameRound={(roundId, newName) => renameAttendanceRound(event.id, roundId, newName)}
        onDeleteRound={(roundId) => deleteAttendanceRound(event.id, roundId)}
        onFilterDropouts={() => setIsFilteringDropouts(!isFilteringDropouts)}
        isFilteringDropouts={isFilteringDropouts}
      />

      {/* Action Controls & Filters */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 justify-between items-center">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="attendance-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الجوال، أو STC..."
              className="w-full pl-4 pr-10 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* View Toggle on Mobile/Tablet */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="عرض البطاقات (مريح للجوال)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[11px] hidden sm:inline">بطاقات</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="عرض الجدول المعتاد"
              >
                <List className="w-4 h-4" />
                <span className="text-[11px] hidden sm:inline">جدول</span>
              </button>
            </div>

            <div className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
              عرض: <span className="font-mono text-gray-800">{filteredAttendees.length}</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="filter-all-btn"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              type="button"
              id="filter-present-btn"
              onClick={() => setFilterStatus('present')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'present'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              الحاضرون ({stats.present})
            </button>
            <button
              type="button"
              id="filter-absent-btn"
              onClick={() => setFilterStatus('absent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'absent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              الغائبون ({stats.absent})
            </button>
            <button
              type="button"
              id="filter-pending-btn"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              المعلق ({stats.pending})
            </button>
          </div>

          {/* Quick Mark All Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              id="mark-all-present-btn"
              onClick={() => handleMarkAll('present')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              تحضير الكل
            </button>
            <button
              type="button"
              id="mark-all-absent-btn"
              onClick={() => handleMarkAll('absent')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              تغييب الكل
            </button>
          </div>
        </div>
      </div>

      {/* Absentees Alert & Follow-up Banner */}
      {stats.absent > 0 && (
        <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-sm shrink-0 border border-rose-200 font-mono">
              {stats.absent}
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-rose-900 leading-tight">
                يوجد {stats.absent} غائبين في هذه الفعالية
              </p>
              <p className="text-[11px] sm:text-xs text-rose-700 mt-0.5">
                يمكنك إرسال رسائل استفسار واعتذار واطمئنان لكل غائب عبر واتساب بضغطة زر واحدة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setBulkWhatsAppTarget('absent');
              setIsBulkWhatsAppOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تنبيه واستفسار الغائبين</span>
          </button>
        </div>
      )}

      {/* Main Attendees Content: Mobile-First Touch Cards OR Responsive Table */}
      {viewMode === 'cards' ? (
        /* Mobile Touch Cards View (Ideal for phone screen & quick tap) */
        <div className="space-y-2.5">
          {filteredAttendees.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 text-gray-400">
              <p className="font-semibold text-sm">لا يوجد مشاركون يطابقون خيارات البحث أو التصفية</p>
            </div>
          ) : (
            filteredAttendees.map((attendee, index) => {
              const isPresent = attendee.status === 'present';
              const isAbsent = attendee.status === 'absent';
              const isPending = attendee.status === 'pending';

              return (
                <div
                  key={attendee.personId}
                  className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all shadow-xs ${
                    isPresent
                      ? 'border-emerald-200 bg-emerald-50/15'
                      : isAbsent
                      ? 'border-rose-200 bg-rose-50/15'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {index + 1}
                      </span>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-[#1A1A1A] text-sm sm:text-base leading-tight truncate">
                          {attendee.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5 flex-wrap">
                          {attendee.phone && (
                            <a
                              href={`tel:${attendee.phone}`}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{attendee.phone}</span>
                            </a>
                          )}
                          {attendee.stcNumber && (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-[11px]">
                              STC: {attendee.stcNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setWhatsAppAttendee(attendee)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="إرسال رسالة واتساب (تذكير / شكر / استفسار غياب)"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAttendee(attendee)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendeeToRemove({ personId: attendee.personId, name: attendee.name })}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Multi-Round Checkpoint Indicators */}
                  {rounds.length > 1 && (
                    <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 overflow-x-auto">
                      <span className="text-[10px] text-gray-500 font-bold shrink-0 ml-1">
                        الجولات:
                      </span>
                      {rounds.map((r, rIdx) => {
                        const rSt = r.records ? r.records[attendee.personId] : undefined;
                        const isThisActive = r.id === activeRoundId;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setActiveAttendanceRound(event.id, r.id);
                            }}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              rSt === 'present'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rSt === 'absent'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-gray-200/80 text-gray-600'
                            } ${isThisActive ? 'ring-2 ring-slate-900 shadow-2xs' : 'opacity-85'}`}
                            title={`${r.name}: ${rSt === 'present' ? 'حاضر' : rSt === 'absent' ? 'غائب' : 'معلق'}`}
                          >
                            <span>ج{rIdx + 1}</span>
                            <span>{rSt === 'present' ? '✔' : rSt === 'absent' ? '✖' : '⏳'}</span>
                          </button>
                        );
                      })}

                      {dropoutsSet.has(attendee.personId) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shrink-0 mr-auto">
                          ⚠️ غادر مبكراً
                        </span>
                      )}
                    </div>
                  )}

                  {/* Big Touch-Friendly Buttons for Phone */}
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100/90 p-1 rounded-xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => handleStatusClick(attendee.personId, 'present')}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                          : 'bg-white/80 text-gray-700 hover:bg-white hover:text-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حاضر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusClick(attendee.personId, 'absent')}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        isAbsent
                          ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                          : 'bg-white/80 text-gray-700 hover:bg-white hover:text-rose-700'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>غائب</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusClick(attendee.personId, 'pending')}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                        isPending
                          ? 'bg-white text-gray-900 shadow-xs font-bold'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>معلق</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Standard Responsive Table View */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/80 text-xs font-bold text-gray-500 select-none">
                <tr>
                  <th className="px-4 py-3 border-b border-gray-100 w-10 text-center">م</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[160px]">الاسم الكامل</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[240px] text-center w-[240px]">حالة الحضور</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[130px]">رقم الجوال</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[130px]">رقم جوال STC</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[160px] hidden md:table-cell">البريد</th>
                  <th className="px-4 py-3 border-b border-gray-100 w-20 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <p className="font-semibold text-sm">لا يوجد مشاركين يطابقون خيارات البحث أو التصفية</p>
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((attendee, index) => {
                    const isPresent = attendee.status === 'present';
                    const isAbsent = attendee.status === 'absent';
                    const isPending = attendee.status === 'pending';

                    return (
                      <tr
                        key={attendee.personId}
                        className={`transition-colors hover:bg-gray-50/80 ${
                          isPresent ? 'bg-emerald-50/20' : isAbsent ? 'bg-rose-50/15' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-xs font-mono text-gray-400 text-center">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-[#1A1A1A]">{attendee.name}</div>
                          {rounds.length > 1 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {rounds.map((r, rIdx) => {
                                const rSt = r.records ? r.records[attendee.personId] : undefined;
                                const isThisActive = r.id === activeRoundId;
                                return (
                                  <span
                                    key={r.id}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                      rSt === 'present'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                                        : rSt === 'absent'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                                        : 'bg-gray-100 text-gray-500'
                                    } ${isThisActive ? 'ring-1 ring-slate-900' : ''}`}
                                    title={`${r.name}: ${rSt === 'present' ? 'حاضر' : rSt === 'absent' ? 'غائب' : 'معلق'}`}
                                  >
                                    ج{rIdx + 1}: {rSt === 'present' ? '✔' : rSt === 'absent' ? '✖' : '⏳'}
                                  </span>
                                );
                              })}
                              {dropoutsSet.has(attendee.personId) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  ⚠️ غادر مبكراً
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-[11px] text-gray-400 md:hidden flex items-center gap-1.5 mt-0.5" dir="ltr">
                            <span>{attendee.phone}</span>
                            {attendee.stcNumber && (
                              <span className="font-mono bg-gray-100 text-gray-700 px-1 py-0.2 rounded-xs text-[10px]">
                                STC: {attendee.stcNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 w-fit mx-auto">
                            <button
                              type="button"
                              onClick={() => handleStatusClick(attendee.personId, 'present')}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>حاضر</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusClick(attendee.personId, 'absent')}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>غائب</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusClick(attendee.personId, 'pending')}
                              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                isPending
                                  ? 'bg-white text-gray-800 shadow-xs font-bold'
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                              title="معلق"
                            >
                              <Clock className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-gray-600 text-left" dir="ltr">
                          <div className="flex items-center justify-start gap-1">
                            {attendee.phone && (
                              <a
                                href={`tel:${attendee.phone}`}
                                className="p-1 rounded-md text-gray-400 hover:text-blue-600"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <span>{attendee.phone || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-gray-600 text-left" dir="ltr">
                          <div className="flex items-center justify-start gap-1">
                            {attendee.stcNumber && (
                              <a
                                href={`tel:${attendee.stcNumber}`}
                                className="p-1 rounded-md text-gray-400 hover:text-blue-600"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <span>{attendee.stcNumber || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-gray-500 text-left" dir="ltr">
                          {attendee.email || '-'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setWhatsAppAttendee(attendee)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="إرسال رسالة واتساب (تذكير / شكر / استفسار غياب)"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAttendee(attendee)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendeeToRemove({ personId: attendee.personId, name: attendee.name })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف"
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
        </div>
      )}

      {/* Bottom Action Floating Bar */}
      <footer className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            id="bottom-back-to-events-btn"
            onClick={() => navigate('/events')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 text-gray-600" />
            <span>رجوع للفعاليات</span>
          </button>

          <span className="text-xs text-gray-400 font-medium">حفظ تلقائي ✓</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => exportToExcel(event, settings)}
            className="flex-1 sm:flex-none p-2 sm:px-3.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setPdfModalEvent(event)}
            className="flex-1 sm:flex-none p-2 sm:px-3.5 sm:py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="طباعة PDF"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => shareViaWhatsApp(event, settings)}
            className="flex-1 sm:flex-none p-2 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
            title="واتساب"
          >
            <Send className="w-3.5 h-3.5" />
            <span>واتساب</span>
          </button>

          <button
            type="button"
            onClick={() => setReportModalEvent(event)}
            className="w-full sm:w-auto bg-black text-white px-4 py-2 rounded-xl font-bold text-xs shadow-xs hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>تقرير المسؤول</span>
            <span>📤</span>
          </button>
        </div>
      </footer>

      {/* Modals */}
      {isAddModalOpen && (
        <AddAttendeeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          currentAttendees={event.attendees}
          availablePersons={persons}
          onAddNewPerson={(name, email, phone, stcNumber) =>
            addAttendeeToEvent(event.id, { name, email, phone, stcNumber }, true)
          }
          onAddMultiplePersons={multipleAttendees =>
            addMultipleAttendeesToEvent(event.id, multipleAttendees, true)
          }
          onAddExistingPersons={selectedPersons => {
            addExistingPersonsToEvent(event.id, selectedPersons);
          }}
        />
      )}

      {editingAttendee && (
        <EditAttendeeModal
          isOpen={!!editingAttendee}
          onClose={() => setEditingAttendee(null)}
          attendee={editingAttendee}
          onSave={(updated, updateGlobal) => {
            editAttendeeInEvent(event.id, updated, updateGlobal);
            setEditingAttendee(null);
          }}
        />
      )}

      {/* WhatsApp Individual Messaging Modal */}
      {whatsAppAttendee && (
        <WhatsAppMessageModal
          isOpen={!!whatsAppAttendee}
          onClose={() => setWhatsAppAttendee(null)}
          attendee={whatsAppAttendee}
          event={event}
        />
      )}

      {/* WhatsApp Bulk / Absentees Messaging Modal */}
      {isBulkWhatsAppOpen && (
        <BulkWhatsAppModal
          isOpen={isBulkWhatsAppOpen}
          onClose={() => setIsBulkWhatsAppOpen(false)}
          event={event}
          initialTarget={bulkWhatsAppTarget}
        />
      )}

      {/* Periodic Rounds Modals */}
      {isNewRoundModalOpen && (
        <NewRoundModal
          isOpen={isNewRoundModalOpen}
          onClose={() => setIsNewRoundModalOpen(false)}
          currentRoundsCount={rounds.length}
          onCreateRound={(name, copyPrevious) => {
            createAttendanceRound(event.id, name, copyPrevious);
          }}
        />
      )}

      {isMatrixModalOpen && (
        <MultiRoundMatrixModal
          isOpen={isMatrixModalOpen}
          onClose={() => setIsMatrixModalOpen(false)}
          event={event}
          onUpdateStatus={(roundId, personId, status) => {
            updateAttendeeRoundStatus(event.id, roundId, personId, status);
          }}
        />
      )}

      {/* Confirm Remove Attendee Modal */}
      <ConfirmModal
        isOpen={Boolean(attendeeToRemove)}
        onClose={() => setAttendeeToRemove(null)}
        onConfirm={() => {
          if (attendeeToRemove) {
            removeAttendeeFromEvent(event.id, attendeeToRemove.personId);
            setAttendeeToRemove(null);
          }
        }}
        title="إزالة المشارك"
        message={`هل أنت متأكد من إزالة "${attendeeToRemove?.name}" من كشف حضور هذه الفعالية؟`}
        confirmText="نعم، إزالة"
        cancelText="إلغاء"
        variant="danger"
        icon="trash"
      />
    </motion.div>
  );
};
