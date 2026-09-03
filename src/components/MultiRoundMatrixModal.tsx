import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  MessageCircle,
  Search,
  Filter,
  Users,
  TrendingDown,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EventItem, AttendanceRound, AttendanceStatus, EventAttendee } from '../types';

interface MultiRoundMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  onUpdateRoundStatus: (roundId: string, personId: string, status: AttendanceStatus) => void;
  onOpenWhatsApp: (attendee: EventAttendee, customText?: string) => void;
}

type ContinuityCategory = 'all' | 'perfect' | 'dropouts' | 'latecomers' | 'absent_all';

export const MultiRoundMatrixModal: React.FC<MultiRoundMatrixModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdateRoundStatus,
  onOpenWhatsApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ContinuityCategory>('all');

  const attendees = event.attendees || [];
  const rounds: AttendanceRound[] = useMemo(() => {
    if (event.rounds && event.rounds.length > 0) {
      return event.rounds;
    }
    // Fallback if no rounds yet
    const initialRecords: Record<string, AttendanceStatus> = {};
    attendees.forEach((a) => {
      initialRecords[a.personId] = a.status;
    });
    return [
      {
        id: 'round-1',
        name: 'الجولة 1 (الحضور المبدئي)',
        createdAt: event.createdAt,
        records: initialRecords,
      },
    ];
  }, [event.rounds, attendees, event.createdAt]);

  // Compute status for each attendee across all rounds
  const attendeesAnalysis = useMemo(() => {
    return attendees.map((att) => {
      const statuses = rounds.map((r) => r.records[att.personId] || 'pending');
      const presentCount = statuses.filter((s) => s === 'present').length;
      const absentCount = statuses.filter((s) => s === 'absent').length;
      const totalRounds = rounds.length;
      const presentRate = totalRounds > 0 ? Math.round((presentCount / totalRounds) * 100) : 0;

      // Classify continuity
      let category: 'perfect' | 'dropouts' | 'latecomers' | 'absent_all' | 'mixed' = 'mixed';
      const firstStatus = statuses[0];
      const lastStatus = statuses[statuses.length - 1];

      if (presentCount === totalRounds && totalRounds > 0) {
        category = 'perfect'; // 100% committed
      } else if (presentCount === 0) {
        category = 'absent_all'; // Never attended
      } else if (firstStatus === 'present' && lastStatus !== 'present') {
        category = 'dropouts'; // Was there, then left!
      } else if (firstStatus !== 'present' && lastStatus === 'present') {
        category = 'latecomers'; // Came later
      } else {
        category = 'dropouts'; // missed a checkpoint
      }

      return {
        attendee: att,
        statuses,
        presentCount,
        absentCount,
        totalRounds,
        presentRate,
        category,
      };
    });
  }, [attendees, rounds]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = attendeesAnalysis.length;
    const perfectCount = attendeesAnalysis.filter((a) => a.category === 'perfect').length;
    const dropoutsCount = attendeesAnalysis.filter((a) => a.category === 'dropouts').length;
    const latecomersCount = attendeesAnalysis.filter((a) => a.category === 'latecomers').length;
    const absentAllCount = attendeesAnalysis.filter((a) => a.category === 'absent_all').length;

    return {
      total,
      perfectCount,
      dropoutsCount,
      latecomersCount,
      absentAllCount,
    };
  }, [attendeesAnalysis]);

  // Filtered list
  const filteredList = useMemo(() => {
    return attendeesAnalysis.filter((item) => {
      const matchesSearch =
        item.attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.attendee.phone.includes(searchQuery) ||
        item.attendee.stcNumber.includes(searchQuery);

      if (!matchesSearch) return false;

      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'perfect') return item.category === 'perfect';
      if (selectedFilter === 'dropouts') return item.category === 'dropouts';
      if (selectedFilter === 'latecomers') return item.category === 'latecomers';
      if (selectedFilter === 'absent_all') return item.category === 'absent_all';

      return true;
    });
  }, [attendeesAnalysis, searchQuery, selectedFilter]);

  if (!isOpen) return null;

  // Export Matrix to Excel
  const handleExportMatrixExcel = () => {
    const rows = attendeesAnalysis.map((item, idx) => {
      const row: Record<string, any> = {
        'م': idx + 1,
        'الاسم الكامل': item.attendee.name,
        'رقم الجوال': item.attendee.phone || '-',
        'رقم جوال STC': item.attendee.stcNumber || '-',
      };

      // Add each round column
      rounds.forEach((round, rIdx) => {
        const st = item.statuses[rIdx];
        row[round.name] = st === 'present' ? 'حاضر ✅' : st === 'absent' ? 'غائب ❌' : 'معلق ⏳';
      });

      row['إجمالي الجولات المحضورة'] = `${item.presentCount} من ${item.totalRounds}`;
      row['نسبة التواجد والالتزام'] = `${item.presentRate}%`;
      row['حالة الاستمرار'] =
        item.category === 'perfect'
          ? 'ملتزم بالكامل ✅'
          : item.category === 'dropouts'
          ? 'غادر مبكراً / تسرّب ⚠️'
          : item.category === 'latecomers'
          ? 'انضم متأخراً ⏰'
          : 'لم يحضر أي جولة ❌';

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!dir'] = 'rtl';
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'مصفوفة التفقد الدوري');
    const safeTitle = (event.title || 'event').replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(workbook, `مصفوفة_التفقد_الدوري_${safeTitle}.xlsx`);
  };

  const cycleStatus = (current: AttendanceStatus): AttendanceStatus => {
    if (current === 'present') return 'absent';
    if (current === 'absent') return 'pending';
    return 'present';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-gray-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    مصفوفة التفقد الدوري (كشف المتسربين والمستمرين)
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                    {rounds.length} جولات تفقد
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  مقارنة حضور كل مشارك عبر كافة الجولات لمعرفة من غادر مبكراً ومن ظل متواجداً حتى النهاية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportMatrixExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير المصفوفة Excel</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
            {/* Metric 1: Perfect */}
            <div
              onClick={() => setSelectedFilter('perfect')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedFilter === 'perfect'
                  ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20'
                  : 'bg-gray-50/60 dark:bg-slate-950/60 border-gray-200 dark:border-slate-800 hover:bg-gray-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="text-[11px] font-bold">ملتزمون دائماً</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                {metrics.perfectCount}
                <span className="text-[10px] text-gray-400 font-normal mr-1">
                  ({Math.round((metrics.perfectCount / (metrics.total || 1)) * 100)}%)
                </span>
              </p>
            </div>

            {/* Metric 2: Dropouts / Left Early */}
            <div
              onClick={() => setSelectedFilter('dropouts')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedFilter === 'dropouts'
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20'
                  : 'bg-gray-50/60 dark:bg-slate-950/60 border-gray-200 dark:border-slate-800 hover:bg-gray-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                <span className="text-[11px] font-bold">⚠️ غادروا مبكراً</span>
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                {metrics.dropoutsCount}
                <span className="text-[10px] text-gray-400 font-normal mr-1">
                  ({Math.round((metrics.dropoutsCount / (metrics.total || 1)) * 100)}%)
                </span>
              </p>
            </div>

            {/* Metric 3: Latecomers */}
            <div
              onClick={() => setSelectedFilter('latecomers')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedFilter === 'latecomers'
                  ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/20'
                  : 'bg-gray-50/60 dark:bg-slate-950/60 border-gray-200 dark:border-slate-800 hover:bg-gray-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                <span className="text-[11px] font-bold">انضموا لاحقاً</span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                {metrics.latecomersCount}
              </p>
            </div>

            {/* Metric 4: Absent throughout */}
            <div
              onClick={() => setSelectedFilter('absent_all')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedFilter === 'absent_all'
                  ? 'bg-rose-500/10 border-rose-500 ring-1 ring-rose-500/20'
                  : 'bg-gray-50/60 dark:bg-slate-950/60 border-gray-200 dark:border-slate-800 hover:bg-gray-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                <span className="text-[11px] font-bold">غائبون بالكامل</span>
                <XCircle className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                {metrics.absentAllCount}
              </p>
            </div>
          </div>

          {/* Search & Filter bar */}
          <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/30 dark:bg-slate-900">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الجوال..."
                className="w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/20 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                الكل ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('dropouts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'dropouts'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                غادروا مبكراً ({metrics.dropoutsCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('perfect')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'perfect'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                ملتزمون بالكامل ({metrics.perfectCount})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            {filteredList.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-bold text-sm">لا توجد نتائج تطابق معايير البحث أو التصفية</p>
              </div>
            ) : (
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-gray-100/80 dark:bg-slate-950 text-gray-700 dark:text-gray-300 sticky top-0 z-10 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold w-12">#</th>
                    <th className="py-3 px-4 font-bold min-w-[160px]">المشارك</th>
                    {rounds.map((r, rIdx) => (
                      <th key={r.id} className="py-3 px-3 font-bold text-center min-w-[110px]">
                        <div className="flex flex-col items-center">
                          <span>{r.name}</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            ({r.records ? Object.values(r.records).filter((s) => s === 'present').length : 0} حاضر)
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 font-bold text-center min-w-[130px]">حالة الاستمرار</th>
                    <th className="py-3 px-4 font-bold text-center w-24">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
                  {filteredList.map((item, idx) => (
                    <tr
                      key={item.attendee.personId}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-400 font-mono text-center">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                          {item.attendee.name}
                        </div>
                        {item.attendee.phone && (
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {item.attendee.phone}
                          </div>
                        )}
                      </td>

                      {/* Status per round (clickable to toggle) */}
                      {rounds.map((r, rIdx) => {
                        const st = item.statuses[rIdx];
                        return (
                          <td key={r.id} className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const nextSt = cycleStatus(st);
                                onUpdateRoundStatus(r.id, item.attendee.personId, nextSt);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                                st === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : st === 'absent'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700'
                              }`}
                              title="انقر للتبديل السريع للحالة في هذه الجولة"
                            >
                              {st === 'present' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {st === 'absent' && <XCircle className="w-3 h-3 text-rose-600" />}
                              {st === 'pending' && <HelpCircle className="w-3 h-3 text-gray-400" />}
                              <span>
                                {st === 'present' ? 'حاضر' : st === 'absent' ? 'غائب' : 'معلق'}
                              </span>
                            </button>
                          </td>
                        );
                      })}

                      {/* Continuity Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {item.category === 'perfect' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            ملتزم 100%
                          </span>
                        ) : item.category === 'dropouts' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            غادر مبكراً ({item.presentCount}/{item.totalRounds})
                          </span>
                        ) : item.category === 'latecomers' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                            <Clock className="w-3 h-3" />
                            انضم متأخراً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3" />
                            لم يحضر (0%)
                          </span>
                        )}
                      </td>

                      {/* Action / WhatsApp */}
                      <td className="py-3 px-4 text-center">
                        {item.attendee.phone ? (
                          <button
                            type="button"
                            onClick={() => {
                              const message =
                                item.category === 'dropouts'
                                  ? `مرحباً ${item.attendee.name}، لاحظنا عدم تواجدك في جولة التفقد الحالية لفعالية (${event.title}). نرجو تأكيد تواجدك أو إعلامنا في حال اضطرارك للمغادرة.`
                                  : undefined;
                              onOpenWhatsApp(item.attendee, message);
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="إرسال رسالة واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-xs text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
            <span className="text-center sm:text-right">
              💡 يمكنك النقر على حالة أي جولة لتعديلها مباشرة (حاضر / غائب / معلق).
            </span>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-all shadow-xs"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
