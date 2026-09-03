import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  X,
  Copy,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface NewRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roundName: string, copyPrevious: boolean) => void;
  nextRoundNumber: number;
  attendeesCount: number;
}

export const NewRoundModal: React.FC<NewRoundModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nextRoundNumber,
  attendeesCount,
}) => {
  const currentTime = new Date().toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const defaultName = `الجولة ${nextRoundNumber} (${currentTime})`;
  const [roundName, setRoundName] = useState(defaultName);
  const [copyPrevious, setCopyPrevious] = useState(true);

  if (!isOpen) return null;

  const presets = [
    `الجولة ${nextRoundNumber} (${currentTime})`,
    'تفقد منتصف اليوم',
    'تفقد بعد الاستراحة',
    'تفقد بعد الظهر',
    'الجولة الختامية',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = roundName.trim() || defaultName;
    onSubmit(finalName, copyPrevious);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  بدء جولة تفقد وتحضير جديدة
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  تحقق من استمرار تواجد المشاركين بعد مرور وقت ({attendeesCount} شخص)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Round Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                مسمى الجولة أو توقيتها:
              </label>
              <input
                type="text"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="مثال: تفقد الساعة 01:30 م"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                autoFocus
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRoundName(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      roundName === preset
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Preparation Option Selection */}
            <div className="space-y-2.5 pt-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                كيف ترغب في بدء حالة الحاضرين في هذه الجولة؟
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: Copy Previous (Recommended) */}
                <div
                  onClick={() => setCopyPrevious(true)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    copyPrevious
                      ? 'bg-slate-900/5 dark:bg-white/5 border-slate-900 dark:border-white ring-1 ring-slate-900/10'
                      : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 hover:bg-gray-100/60'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      copyPrevious
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                        : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {copyPrevious && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                        نسخ حالة الحضور من الجولة السابقة
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        موصى به وسريع
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      يُبقي على من كانوا حاضرين ويسهل عليك فقط تحويل من غادروا أو انصرفوا إلى «غائب».
                    </p>
                  </div>
                </div>

                {/* Option 2: Reset to pending */}
                <div
                  onClick={() => setCopyPrevious(false)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    !copyPrevious
                      ? 'bg-slate-900/5 dark:bg-white/5 border-slate-900 dark:border-white ring-1 ring-slate-900/10'
                      : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 hover:bg-gray-100/60'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      !copyPrevious
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                        : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {!copyPrevious && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                      البدء من الصفر (تصفير حالة الجميع إلى معلق)
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      مناسب إذا كنت تريد إعادة مناداة الأسماء أو مسح البطاقات بالباركود من جديد.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hint message */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                ستتمكن بعد ذلك من مقارنة حضور كل شخص عبر الجولات واكتشاف من غادر مبكراً أو تسرّب تلقائياً.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>اعتماد وبدء الجولة الآن</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
