import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  Plus,
  Clock,
  ArrowLeft,
  Share2,
  Edit2,
  Trash2,
  MapPin,
  BarChart3,
  Printer,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAttendanceStats } from '../utils/exportUtils';
import { motion } from 'motion/react';
import { ConfirmModal } from '../components/ConfirmModal';

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    events,
    settings,
    setIsCreateEventOpen,
    setReportModalEvent,
    setPdfModalEvent,
    deleteEvent,
    setEditingEvent,
    setIsEditEventOpen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [eventToDelete, setEventToDelete] = useState<{ id: string; title: string } | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const overallStats = useMemo(() => {
    let totalAttendees = 0;
    let totalPresent = 0;
    let todayEvents = 0;

    (events || []).forEach(evt => {
      const atts = evt?.attendees || [];
      totalAttendees += atts.length;
      totalPresent += atts.filter(a => a?.status === 'present').length;
      if (evt?.date === today) todayEvents++;
    });

    return {
      totalEvents: (events || []).length,
      totalAttendees,
      totalPresent,
      todayEvents,
      rate: totalAttendees > 0 ? Math.round((totalPresent / totalAttendees) * 100) : 0,
    };
  }, [events, today]);

  const filteredEvents = useMemo(() => {
    const list = events || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(e =>
      e?.title?.toLowerCase().includes(q) ||
      (e?.date && e.date.includes(q)) ||
      (e?.location && e.location.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-20"
    >
      {/* Top Banner & Fast Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide">
                {settings.orgName || 'نظام إدارة الحضور والفعاليات'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                قائمة الفعاليات
              </h2>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-100 font-mono">
                {(events || []).length} فعالية
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              اختر أي فعالية للانتقال الفوري إلى صفحة التحضير ورصد الحضور
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              id="goto-reports-btn"
              onClick={() => navigate('/reports')}
              className="bg-gray-100 text-gray-800 hover:bg-gray-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>صفحة التقارير</span>
            </button>

            <button
              type="button"
              id="create-event-main-btn"
              onClick={() => setIsCreateEventOpen(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إيفنت جديد</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-gray-100">
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي الفعاليات</p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{overallStats.totalEvents}</p>
          </div>

          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-xs mb-1 font-medium">فعاليات اليوم</p>
            <p className="text-2xl font-bold font-mono text-blue-600">{overallStats.todayEvents}</p>
          </div>

          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي المدعوين</p>
            <p className="text-2xl font-bold font-mono text-gray-800">{overallStats.totalAttendees}</p>
          </div>

          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي الحضور الفعلي</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-emerald-600">{overallStats.totalPresent}</p>
              <span className="text-xs text-gray-500 font-mono">({overallStats.rate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="events-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث عن فعالية بالاسم، التاريخ، أو المكان..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
          />
        </div>

        <div className="text-xs text-gray-500 self-end sm:self-center font-medium">
          عرض <span className="font-bold text-[#1A1A1A] font-mono">{filteredEvents.length}</span> من أصل <span className="font-bold font-mono">{(events || []).length}</span> فعالية
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1A1A1A] mb-1">لا توجد فعاليات مطابقة</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-6">
            {searchQuery ? 'لم نجد أي إيفنت يطابق عبارة البحث الحالية.' : 'لم تقم بإنشاء أي فعالية بعد. ابدأ بإضافة أول إيفنت.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateEventOpen(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فعالية جديدة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(event => {
            const stats = getAttendanceStats(event);
            const isToday = event.date === today;

            return (
              <div
                key={event.id}
                id={`event-card-${event.id}`}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                            <Clock className="w-3 h-3" />
                            {event.date}
                          </span>
                          {isToday && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              اليوم
                            </span>
                          )}
                        </div>
                        <h3
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="font-bold text-[#1A1A1A] text-base sm:text-lg hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
                          title={event.title}
                        >
                          {event.title}
                        </h3>
                      </div>

                      {/* Dropdown actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(event);
                            setIsEditEventOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل بيانات الفعالية"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventToDelete({ id: event.id, title: event.title })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الفعالية"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {event.location && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    )}
                  </div>

                  {/* Attendance Stats Progress */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">نسبة الحضور</span>
                      <span className="font-bold font-mono text-[#1A1A1A]">{stats.presentPct}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${stats.presentPct}%` }}
                      />
                      <div
                        className="h-full bg-rose-400 transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.absent / stats.total) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Stat Badges */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                      <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <span className="block text-[10px] text-gray-400 font-sans">المدعوين</span>
                        <span className="text-xs font-bold text-gray-800">{stats.total}</span>
                      </div>
                      <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                        <span className="block text-[10px] text-emerald-600 font-sans">حاضر</span>
                        <span className="text-xs font-bold text-emerald-700">{stats.present}</span>
                      </div>
                      <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100">
                        <span className="block text-[10px] text-rose-600 font-sans">غائب</span>
                        <span className="text-xs font-bold text-rose-700">{stats.absent}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReportModalEvent(event)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      title="مشاركة التقرير السريع"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تقرير</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPdfModalEvent(event)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      title="طباعة تقرير PDF الرسمي"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>PDF</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="bg-[#1A1A1A] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 group-hover:bg-blue-600"
                  >
                    <span>تحضير الحضور</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Event Modal */}
      <ConfirmModal
        isOpen={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => {
          if (eventToDelete) {
            deleteEvent(eventToDelete.id);
            setEventToDelete(null);
          }
        }}
        title="حذف الفعالية"
        message={`هل أنت متأكد من حذف فعالية "${eventToDelete?.title}" نهائياً؟ سيتم حذف جميع سجلات الحضور المرتبطة بها.`}
        confirmText="نعم، حذف الفعالية"
        cancelText="إلغاء"
        variant="danger"
        icon="trash"
      />
    </motion.div>
  );
};
