import React, { useState } from 'react';
import { X, Calendar, Search, Check } from 'lucide-react';
import { Person } from '../types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (title: string, date: string, location?: string, notes?: string, selectedPersons?: Person[]) => void;
  onCreateEvent?: (eventData: {
    title: string;
    date: string;
    location: string;
    notes?: string;
    selectedPersonIds: string[];
    customAttendees: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>;
  }) => void;
  availablePersons?: Person[];
  allPersons?: Person[];
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onCreateEvent,
  availablePersons,
  allPersons,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [personSearch, setPersonSearch] = useState('');
  const [includeExisting, setIncludeExisting] = useState(false);

  if (!isOpen) return null;

  const personList = availablePersons || allPersons || [];

  const filteredPersons = personList.filter(p => {
    const q = personSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p?.name?.toLowerCase().includes(q) ||
      (p?.phone && p.phone.includes(q)) ||
      (p?.stcNumber && p.stcNumber.toLowerCase().includes(q)) ||
      (p?.email && p.email.toLowerCase().includes(q))
    );
  });

  const togglePerson = (id: string) => {
    setSelectedPersonIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAllPersons = () => {
    if (selectedPersonIds.length === filteredPersons.length) {
      setSelectedPersonIds([]);
    } else {
      setSelectedPersonIds(filteredPersons.map(p => p.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const selectedPersonsList = personList.filter(p => selectedPersonIds.includes(p.id));
    
    if (typeof onCreateEvent === 'function') {
      onCreateEvent({
        title: title.trim(),
        date,
        location: location.trim(),
        notes: notes.trim() || undefined,
        selectedPersonIds: includeExisting ? selectedPersonIds : [],
        customAttendees: [],
      });
    } else if (typeof onSubmit === 'function') {
      onSubmit(
        title.trim(),
        date,
        location.trim() || undefined,
        notes.trim() || undefined,
        includeExisting ? selectedPersonsList : []
      );
    }
    
    setTitle('');
    setLocation('');
    setNotes('');
    setSelectedPersonIds([]);
    setIncludeExisting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">إنشاء إيفنت جديد</h2>
              <p className="text-xs text-gray-400">أدخل بيانات الفعالية للبدء في تحضير الحضور</p>
            </div>
          </div>
          <button
            id="close-create-event-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Event Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              اسم الإيفنت / الفعالية <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="event-title-input"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: الاجتماع السنوي لمجلس الإدارة"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Event Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                تاريخ الإيفنت <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="event-date-input"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الموقع / القاعة (اختياري)
              </label>
              <input
                type="text"
                id="event-location-input"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="مثال: قاعة المؤتمرات 1"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ملاحظات أو تفاصيل إضافية (اختياري)
            </label>
            <textarea
              id="event-notes-input"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: الحضور بالزي الرسمي - يبدأ التحضير 8:00 صباحاً"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          {/* Pre-fill attendees from database */}
          {personList.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer mb-2.5">
                <input
                  type="checkbox"
                  id="include-existing-checkbox"
                  checked={includeExisting}
                  onChange={e => {
                    setIncludeExisting(e.target.checked);
                    if (e.target.checked && selectedPersonIds.length === 0) {
                      setSelectedPersonIds(personList.map(p => p.id));
                    }
                  }}
                  className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-xs font-bold text-gray-800">
                  إضافة مشاركين مسجلين مسبقاً ({personList.length} أشخاص في الدليل)
                </span>
              </label>

              {includeExisting && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={personSearch}
                        onChange={e => setPersonSearch(e.target.value)}
                        placeholder="بحث بالاسم أو الجوال أو جوال STC..."
                        className="w-full pr-8 pl-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={selectAllPersons}
                      className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {selectedPersonIds.length === filteredPersons.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-gray-100">
                    {filteredPersons.map(person => {
                      const isSelected = selectedPersonIds.includes(person.id);
                      return (
                        <div
                          key={person.id}
                          onClick={() => togglePerson(person.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                            isSelected ? 'bg-blue-50/70 border border-blue-200 font-semibold' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-sm flex items-center justify-center border ${
                                isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-[#1A1A1A]">{person.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono" dir="ltr">
                            <span>{person.phone}</span>
                            {person.stcNumber && (
                              <span className="bg-gray-200 px-1.5 py-0.5 rounded-sm text-[10px] text-gray-700">{person.stcNumber}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-gray-500 text-left">
                    تم تحديد {selectedPersonIds.length} من {personList.length}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              id="confirm-create-event-btn"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              إنشاء الفعالية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
