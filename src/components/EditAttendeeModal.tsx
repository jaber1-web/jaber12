import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { EventAttendee } from '../types';

interface EditAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: EventAttendee | null;
  onSave: (attendee: EventAttendee, updateGlobal: boolean) => void;
}

export const EditAttendeeModal: React.FC<EditAttendeeModalProps> = ({
  isOpen,
  onClose,
  attendee,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stcNumber, setStcNumber] = useState('');
  const [updateGlobal, setUpdateGlobal] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (attendee) {
      setName(attendee.name || '');
      setEmail(attendee.email || '');
      setPhone(attendee.phone || '');
      setStcNumber(attendee.stcNumber || '');
      setError('');
    }
  }, [attendee]);

  if (!isOpen || !attendee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة الاسم');
      return;
    }
    if (!phone.trim() && !stcNumber.trim()) {
      setError('يرجى كتابة رقم الجوال أو رقم جوال STC');
      return;
    }

    const updated: EventAttendee = {
      ...attendee,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      stcNumber: stcNumber.trim(),
    };

    onSave(updated, updateGlobal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">تعديل بيانات الشخص</h2>
              <p className="text-xs text-gray-400">تحديث البيانات الفردية وسجل الحضور</p>
            </div>
          </div>
          <button
            id="close-edit-attendee-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="edit-attendee-name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              id="edit-attendee-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-left font-mono"
              dir="ltr"
            />
          </div>

          {/* Phone & STC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم الجوال <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="edit-attendee-phone"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-left font-mono"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم جوال STC <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="edit-attendee-stc"
                required
                value={stcNumber}
                onChange={e => setStcNumber(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Sync to global directory checkbox */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="sync-global-checkbox"
                checked={updateGlobal}
                onChange={e => setUpdateGlobal(e.target.checked)}
                className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-xs text-gray-700 font-medium">
                تحديث البيانات في قاعدة بيانات الأشخاص العامة أيضاً
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              id="confirm-edit-attendee-btn"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
