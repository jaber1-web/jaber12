import React, { useState } from 'react';
import { X, UserPlus, Users, Search, Check, AlertCircle } from 'lucide-react';
import { Person, EventAttendee } from '../types';

interface AddAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNewPerson: (name: string, email: string, phone: string, stcNumber: string) => void;
  onAddExistingPersons: (persons: Person[]) => void;
  availablePersons: Person[];
  currentAttendees: EventAttendee[];
}

export const AddAttendeeModal: React.FC<AddAttendeeModalProps> = ({
  isOpen,
  onClose,
  onAddNewPerson,
  onAddExistingPersons,
  availablePersons,
  currentAttendees,
}) => {
  const [tab, setTab] = useState<'new' | 'existing'>('new');
  
  // New person form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stcNumber, setStcNumber] = useState('');
  const [validationError, setValidationError] = useState('');

  // Existing persons selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const attendeeList = currentAttendees || [];
  const personList = availablePersons || [];
  const currentAttendeePersonIds = new Set(attendeeList.map(a => a.personId));

  const filteredExisting = personList.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p?.name?.toLowerCase().includes(q) ||
      (p?.phone && p.phone.includes(q)) ||
      (p?.stcNumber && p.stcNumber.toLowerCase().includes(q)) ||
      (p?.email && p.email.toLowerCase().includes(q))
    );
  });

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('يرجى إدخال اسم الشخص');
      return;
    }
    if (!phone.trim() && !stcNumber.trim()) {
      setValidationError('يرجى إدخال رقم الجوال أو رقم جوال STC');
      return;
    }

    onAddNewPerson(name.trim(), email.trim(), phone.trim(), stcNumber.trim());
    // reset form
    setName('');
    setEmail('');
    setPhone('');
    setStcNumber('');
    setValidationError('');
    onClose();
  };

  const toggleSelectExisting = (person: Person) => {
    if (currentAttendeePersonIds.has(person.id)) return; // already added

    setSelectedPersonIds(prev =>
      prev.includes(person.id)
        ? prev.filter(id => id !== person.id)
        : [...prev, person.id]
    );
  };

  const handleAddExistingSubmit = () => {
    const selected = personList.filter(p => selectedPersonIds.includes(p.id));
    if (selected.length === 0) return;
    onAddExistingPersons(selected);
    setSelectedPersonIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">إضافة شخص إلى الفعالية</h2>
              <p className="text-xs text-gray-400">تسجيل شخص جديد أو الاختيار من قاعدة البيانات</p>
            </div>
          </div>
          <button
            id="close-add-attendee-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3 gap-2">
          <button
            type="button"
            id="tab-new-person-btn"
            onClick={() => setTab('new')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              tab === 'new'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>إدخال شخص جديد</span>
          </button>

          <button
            type="button"
            id="tab-existing-person-btn"
            onClick={() => setTab('existing')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              tab === 'existing'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>من الأشخاص السابقين ({(availablePersons || []).length})</span>
          </button>
        </div>

        {/* Tab 1: New Person Form */}
        {tab === 'new' && (
          <form onSubmit={handleAddNewSubmit} className="p-6 space-y-4">
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="person-name-input"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: عبدالله محمد الهاجري"
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
                id="person-email-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-left"
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
                  id="person-phone-input"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رقم جوال STC <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="person-stc-input"
                  required
                  value={stcNumber}
                  onChange={e => setStcNumber(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>سيتم حفظ بيانات الشخص تلقائياً في قاعدة البيانات لإعادة استخدامها في الفعاليات القادمة.</span>
            </div>

            {/* Footer */}
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
                id="submit-add-new-person-btn"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                إضافة الشخص وتحضيره
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Existing Persons List */}
        {tab === 'existing' && (
          <div className="p-6 space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="search-existing-persons-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الجوال، أو جوال STC..."
                className="w-full pr-9 pl-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100">
              {filteredExisting.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs font-medium">
                  لا توجد نتائج مطابقة للبحث
                </div>
              ) : (
                filteredExisting.map(person => {
                  const isAlreadyInEvent = currentAttendeePersonIds.has(person.id);
                  const isSelected = selectedPersonIds.includes(person.id);

                  return (
                    <div
                      key={person.id}
                      onClick={() => !isAlreadyInEvent && toggleSelectExisting(person)}
                      className={`p-3 rounded-xl flex items-center justify-between text-xs transition-all ${
                        isAlreadyInEvent
                          ? 'bg-gray-100 opacity-60 cursor-not-allowed text-gray-500'
                          : isSelected
                          ? 'bg-blue-50 border-2 border-blue-600 cursor-pointer shadow-xs font-semibold'
                          : 'bg-white hover:bg-gray-50 border border-gray-200 cursor-pointer text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isAlreadyInEvent
                              ? 'bg-gray-300 border-gray-300 text-white'
                              : isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {(isSelected || isAlreadyInEvent) && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                            <span>{person.name}</span>
                            {isAlreadyInEvent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                                مضاف مسبقاً
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{person.phone}</span>
                            {person.email && <span>• {person.email}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-left" dir="ltr">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-mono text-xs font-medium border border-gray-200">
                          {person.stcNumber}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">
                تم تحديد <strong className="text-blue-600">{selectedPersonIds.length}</strong> شخص
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  id="confirm-add-existing-btn"
                  disabled={selectedPersonIds.length === 0}
                  onClick={handleAddExistingSubmit}
                  className={`px-5 py-2.5 rounded-lg text-white text-xs sm:text-sm font-medium shadow-xs transition-all ${
                    selectedPersonIds.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  إضافة ({selectedPersonIds.length}) إلى الإيفنت
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
