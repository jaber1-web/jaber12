import React, { useState } from 'react';
import {
  Clock,
  Plus,
  TableProperties,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  History,
  TrendingDown,
} from 'lucide-react';
import { EventItem, AttendanceRound, AttendanceStatus } from '../types';

interface AttendanceRoundsBarProps {
  event: EventItem;
  activeRoundId?: string;
  onSelectRound: (roundId: string) => void;
  onOpenNewRoundModal: () => void;
  onOpenMatrixModal: () => void;
  onRenameRound: (roundId: string, newName: string) => void;
  onDeleteRound: (roundId: string) => void;
  onFilterDropouts?: () => void;
  isFilteringDropouts?: boolean;
}

export const AttendanceRoundsBar: React.FC<AttendanceRoundsBarProps> = ({
  event,
  activeRoundId,
  onSelectRound,
  onOpenNewRoundModal,
  onOpenMatrixModal,
  onRenameRound,
  onDeleteRound,
  onFilterDropouts,
  isFilteringDropouts,
}) => {
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');
  const [menuOpenRoundId, setMenuOpenRoundId] = useState<string | null>(null);

  const attendees = event.attendees || [];
  const rounds: AttendanceRound[] = event.rounds && event.rounds.length > 0
    ? event.rounds
    : [
        {
          id: 'round-init',
          name: 'الجولة 1 (الحضور المبدئي)',
          createdAt: event.createdAt,
          records: Object.fromEntries(attendees.map((a) => [a.personId, a.status])),
        },
      ];

  const currentActiveId = activeRoundId || rounds[rounds.length - 1]?.id;
  const activeRoundIndex = rounds.findIndex((r) => r.id === currentActiveId);

  // Compute dropouts (attendees who were present in any previous round, but are absent in the active round)
  const dropouts = React.useMemo(() => {
    if (activeRoundIndex <= 0) return [];
    const activeRound = rounds[activeRoundIndex];
    if (!activeRound) return [];

    const prevRounds = rounds.slice(0, activeRoundIndex);
    return attendees.filter((att) => {
      const isAbsentNow = (activeRound.records[att.personId] || att.status) === 'absent';
      const wasPresentBefore = prevRounds.some(
        (pr) => pr.records[att.personId] === 'present'
      );
      return isAbsentNow && wasPresentBefore;
    });
  }, [rounds, activeRoundIndex, attendees]);

  const handleStartRename = (round: AttendanceRound) => {
    setEditingRoundId(round.id);
    setEditNameText(round.name);
    setMenuOpenRoundId(null);
  };

  const handleSaveRename = (roundId: string) => {
    if (editNameText.trim()) {
      onRenameRound(roundId, editNameText.trim());
    }
    setEditingRoundId(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-2xs font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                جولات التفقد الدوري (التأكد من التواجد كل كم ساعة)
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
                {rounds.length} {rounds.length === 1 ? 'جولة' : 'جولات'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              أنشئ جولة جديدة كل ساعتين أو بعد الاستراحة لحصر استمرار الحضور وكشف من غادر مبكراً
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onOpenMatrixModal}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
            title="عرض مصفوفة المقارنة الشاملة لجميع الجولات"
          >
            <TableProperties className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>مصفوفة المقارنة</span>
          </button>

          <button
            type="button"
            id="btn-new-attendance-round"
            onClick={onOpenNewRoundModal}
            className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ جولة تفقد جديدة</span>
          </button>
        </div>
      </div>

      {/* Rounds Pills Slider */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
        {rounds.map((round, idx) => {
          const isActive = round.id === currentActiveId;
          const isEditing = editingRoundId === round.id;

          // Count stats for this round
          const records = round.records || {};
          const presentCount = Object.values(records).filter((s) => s === 'present').length;
          const absentCount = Object.values(records).filter((s) => s === 'absent').length;

          return (
            <div
              key={round.id}
              className={`relative flex items-center shrink-0 rounded-xl transition-all border ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-950/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-800 hover:bg-gray-100/80 dark:hover:bg-slate-800'
              }`}
            >
              {isEditing ? (
                <div className="flex items-center gap-1 p-1.5">
                  <input
                    type="text"
                    value={editNameText}
                    onChange={(e) => setEditNameText(e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-xs font-bold border border-gray-300 dark:border-slate-600 focus:outline-none w-32 sm:w-44"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRename(round.id)}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRoundId(null)}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelectRound(round.id)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold cursor-pointer text-right"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{round.name}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-950'
                          : 'bg-gray-200/80 text-gray-700 dark:bg-slate-800 dark:text-gray-300'
                      }`}
                    >
                      {presentCount} حاضر
                      {absentCount > 0 ? ` • ${absentCount} غائب` : ''}
                    </span>
                  </button>

                  {/* Options button (rename / delete) */}
                  <div className="relative pl-1">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuOpenRoundId(menuOpenRoundId === round.id ? null : round.id)
                      }
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'text-white/70 hover:text-white hover:bg-white/10 dark:text-zinc-700 dark:hover:text-zinc-950 dark:hover:bg-zinc-200'
                          : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50'
                      }`}
                      title="خيارات الجولة"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {menuOpenRoundId === round.id && (
                      <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-20 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => handleStartRename(round)}
                          className="w-full text-right px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                          <span>تعديل الاسم</span>
                        </button>
                        {rounds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenRoundId(null);
                              onDeleteRound(round.id);
                            }}
                            className="w-full text-right px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف الجولة</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Early Drop-out Alert Banner */}
      {dropouts.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>تنبيه انصراف مبكر:</strong> تم رصد{' '}
              <span className="font-bold underline">{dropouts.length} مشارك</span> كانوا حاضرين في
              جولة سابقة وتغيبوا في الجولة الحالية!
            </span>
          </div>

          {onFilterDropouts && (
            <button
              type="button"
              onClick={onFilterDropouts}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer shrink-0 ${
                isFilteringDropouts
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-200/70 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
              }`}
            >
              {isFilteringDropouts ? 'إلغاء التصفية' : `عرض من غادروا فقط (${dropouts.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
