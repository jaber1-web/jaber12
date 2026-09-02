import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Share2,
  Edit2,
  Trash2,
  MapPin,
} from 'lucide-react';
import { EventItem } from '../types';
import { getAttendanceStats } from '../utils/exportUtils';

interface EventsListViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onOpenCreateEvent: () => void;
  onOpenReportModal: (event: EventItem) => void;
  onDeleteEvent: (eventId: string) => void;
  onEditEvent: (event: EventItem) => void;
}

export const EventsListView: React.FC<EventsListViewProps> = ({
  events,
  onSelectEvent,
  onOpenCreateEvent,
  onOpenReportModal,
  onDeleteEvent,
  onEditEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const overallStats = useMemo(() => {
    let totalAttendees = 0;
    let totalPresent = 0;
    let todayEvents = 0;

    (events || []).forEach(evt => {
      const attendees = evt?.attendees || [];
      totalAttendees += attendees.length;
      totalPresent += attendees.filter(a => a?.status === 'present').length;
      if (evt?.date === today) todayEvents++;
    });

    return {
      totalEvents: (events || []).length,
      totalAttendees,
      totalPresent,
      todayEvents,
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
    <div className="space-y-6 pb-20">
      {/* Top Banner & Fast Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
              قائمة الفعاليات
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              اختر أي إيفنت للبدء في التحضير الفوري وتسجيل الحاضرين
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="create-event-main-btn"
              onClick={onOpenCreateEvent}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إيفنت جديد</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-gray-100">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي الفعاليات</p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{overallStats.totalEvents}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs mb-1 font-medium">إجمالي المسجلين</p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{overallStats.totalAttendees}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-green-600 text-xs mb-1 font-medium">سجلات الحضور ✅</p>
            <p className="text-2xl font-bold font-mono text-green-600">{overallStats.totalPresent}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-blue-600 text-xs mb-1 font-medium">فعاليات اليوم</p>
            <p className="text-2xl font-bold font-mono text-blue-600">{overallStats.todayEvents}</p>
          </div>
        </div>
      </div>

      {/* Search Bar & List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            id="events-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث عن إيفنت بالاسم، التاريخ، أو المكان..."
            className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
          />
        </div>

        <span className="text-xs text-gray-500 font-medium self-end sm:self-auto">
          عرض {filteredEvents.length} من {(events || []).length} إيفنت
        </span>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-[#1A1A1A] mb-1">
            {searchQuery ? 'لا توجد فعاليات مطابقة للبحث' : 'لم تقم بإنشاء أي إيفنت حتى الآن'}
          </h3>
          <p className="text-xs text-gray-500 mb-5 max-w-sm mx-auto">
            أضف إيفنت جديد وحدد اسمه وتاريخه للبدء في تحضير الحضور فوراً
          </p>
          <button
            type="button"
            onClick={onOpenCreateEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            + إنشاء أول إيفنت
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => {
            const stats = getAttendanceStats(event);
            const isToday = event.date === today;

            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Event Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>{event.date}</span>
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          اليوم
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onEditEvent(event)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="تعديل بيانات الإيفنت"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف إيفنت "${event.title}"؟`)) {
                            onDeleteEvent(event.id);
                          }
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="حذف الإيفنت"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3
                    onClick={() => onSelectEvent(event)}
                    className="text-base sm:text-lg font-bold text-[#1A1A1A] line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {event.title}
                  </h3>

                  {event.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-500 block font-medium">المسجلين</span>
                      <span className="text-sm font-bold text-[#1A1A1A] font-mono">{stats.total}</span>
                    </div>
                    <div className="bg-green-50/50 p-2 rounded-xl border border-green-100">
                      <span className="text-[10px] text-green-700 block font-medium">حاضر ✅</span>
                      <span className="text-sm font-bold text-green-600 font-mono">{stats.present}</span>
                    </div>
                    <div className="bg-red-50/50 p-2 rounded-xl border border-red-100">
                      <span className="text-[10px] text-red-700 block font-medium">لم يحضر ❌</span>
                      <span className="text-sm font-bold text-red-500 font-mono">{stats.absent}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>نسبة الحضور:</span>
                      <strong className="text-blue-600 font-mono">{stats.presentPct}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${stats.presentPct}%` }}
                        className="bg-green-500 h-full"
                      />
                      <div
                        style={{ width: `${stats.absentPct}%` }}
                        className="bg-red-500 h-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Event Card Bottom Actions */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <span>الدخول للتحضير</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenReportModal(event)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    title="عرض وإرسال التقرير للمسؤول"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>التقرير</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
