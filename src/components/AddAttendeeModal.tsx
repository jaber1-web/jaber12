import React, { useState, useRef } from 'react';
import {
  X,
  UserPlus,
  Users,
  Search,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  AlignLeft,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Person, EventAttendee } from '../types';

interface AddAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNewPerson: (name: string, email: string, phone: string, stcNumber: string) => void;
  onAddMultiplePersons?: (
    persons: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>
  ) => void;
  onAddExistingPersons: (persons: Person[]) => void;
  availablePersons: Person[];
  currentAttendees: EventAttendee[];
}

export const AddAttendeeModal: React.FC<AddAttendeeModalProps> = ({
  isOpen,
  onClose,
  onAddNewPerson,
  onAddMultiplePersons,
  onAddExistingPersons,
  availablePersons,
  currentAttendees,
}) => {
  const [tab, setTab] = useState<'new' | 'bulk' | 'excel' | 'existing'>('new');

  // Single person form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stcNumber, setStcNumber] = useState('');
  const [validationError, setValidationError] = useState('');

  // Bulk paste state
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');

  // Excel import state
  const [excelPreview, setExcelPreview] = useState<
    Array<{ name: string; phone?: string; stcNumber?: string; email?: string }>
  >([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelError, setExcelError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing persons selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const attendeeList = currentAttendees || [];
  const personList = availablePersons || [];
  const currentAttendeePersonIds = new Set(attendeeList.map((a) => a.personId));

  const filteredExisting = personList.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p?.name?.toLowerCase().includes(q) ||
      (p?.phone && p.phone.includes(q)) ||
      (p?.stcNumber && p.stcNumber.toLowerCase().includes(q)) ||
      (p?.email && p.email.toLowerCase().includes(q))
    );
  });

  // Handle single person submit
  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('يرجى إدخال اسم الشخص');
      return;
    }

    onAddNewPerson(name.trim(), email.trim(), phone.trim(), stcNumber.trim());
    setName('');
    setEmail('');
    setPhone('');
    setStcNumber('');
    setValidationError('');
    onClose();
  };

  // Handle Bulk Paste submit
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setBulkError('يرجى كتابة أو لصق الأسماء أولاً');
      return;
    }

    const parsedList: Array<{ name: string; phone?: string; stcNumber?: string; email?: string }> = [];

    lines.forEach((line) => {
      // Split by comma, tab, or dash if available
      const parts = line.split(/[,\t|]+/).map((p) => p.trim());
      if (parts.length >= 2) {
        const personName = parts[0];
        let personPhone = '';
        let personStc = '';
        let personEmail = '';

        for (let i = 1; i < parts.length; i++) {
          const item = parts[i];
          if (item.includes('@')) {
            personEmail = item;
          } else if (/^05\d+/.test(item) || /^\+?\d{8,}/.test(item)) {
            if (!personPhone) personPhone = item;
            else if (!personStc) personStc = item;
          } else if (item.length >= 6) {
            personStc = item;
          }
        }
        if (personName) {
          parsedList.push({ name: personName, phone: personPhone, stcNumber: personStc, email: personEmail });
        }
      } else {
        // Just single name per line (possibly with phone at end)
        const phoneMatch = line.match(/(05\d{8}|\+9665\d{8}|\d{9,12})/);
        if (phoneMatch) {
          const cleanName = line.replace(phoneMatch[0], '').trim();
          parsedList.push({
            name: cleanName || line,
            phone: phoneMatch[0],
            stcNumber: '',
            email: '',
          });
        } else {
          parsedList.push({
            name: line,
            phone: '',
            stcNumber: '',
            email: '',
          });
        }
      }
    });

    if (parsedList.length === 0) {
      setBulkError('لم يتم العثور على أسماء صالحة');
      return;
    }

    if (onAddMultiplePersons) {
      onAddMultiplePersons(parsedList);
    } else {
      parsedList.forEach((p) => onAddNewPerson(p.name, p.email || '', p.phone || '', p.stcNumber || ''));
    }

    setBulkText('');
    setBulkError('');
    onClose();
  };

  // Handle Excel Upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setExcelError('الملف فارغ أو لا يحتوي على بيانات');
          return;
        }

        const parsed: Array<{ name: string; phone?: string; stcNumber?: string; email?: string }> = [];

        rows.forEach((row) => {
          // Detect columns intelligently
          const nameVal =
            row['الاسم'] ||
            row['الاسم الكامل'] ||
            row['اسم'] ||
            row['Name'] ||
            row['name'] ||
            row['Full Name'] ||
            row['المشارك'] ||
            Object.values(row)[0];

          const phoneVal =
            row['الجوال'] ||
            row['رقم الجوال'] ||
            row['الهاتف'] ||
            row['Phone'] ||
            row['Mobile'] ||
            row['mobile'] ||
            '';

          const stcVal =
            row['جوال STC'] ||
            row['رقم STC'] ||
            row['STC'] ||
            row['stc'] ||
            row['رقم جوال STC'] ||
            '';

          const emailVal =
            row['البريد الإلكتروني'] ||
            row['الإيميل'] ||
            row['Email'] ||
            row['email'] ||
            '';

          if (nameVal && typeof nameVal === 'string' && nameVal.trim()) {
            parsed.push({
              name: String(nameVal).trim(),
              phone: phoneVal ? String(phoneVal).trim() : '',
              stcNumber: stcVal ? String(stcVal).trim() : '',
              email: emailVal ? String(emailVal).trim() : '',
            });
          }
        });

        if (parsed.length === 0) {
          setExcelError('لم يتم العثور على عمود يحمل اسم الشخص في الملف');
          return;
        }

        setExcelPreview(parsed);
      } catch (err) {
        console.error(err);
        setExcelError('حدث خطأ أثناء قراءة ملف الإكسل');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmExcel = () => {
    if (excelPreview.length === 0) return;

    if (onAddMultiplePersons) {
      onAddMultiplePersons(excelPreview);
    } else {
      excelPreview.forEach((p) => onAddNewPerson(p.name, p.email || '', p.phone || '', p.stcNumber || ''));
    }

    setExcelPreview([]);
    setExcelFileName('');
    onClose();
  };

  const toggleSelectExisting = (person: Person) => {
    if (currentAttendeePersonIds.has(person.id)) return;

    setSelectedPersonIds((prev) =>
      prev.includes(person.id) ? prev.filter((id) => id !== person.id) : [...prev, person.id]
    );
  };

  const selectAllAvailable = () => {
    const unadded = filteredExisting.filter((p) => !currentAttendeePersonIds.has(p.id));
    if (selectedPersonIds.length === unadded.length) {
      setSelectedPersonIds([]);
    } else {
      setSelectedPersonIds(unadded.map((p) => p.id));
    }
  };

  const handleAddExistingSubmit = () => {
    const selected = personList.filter((p) => selectedPersonIds.includes(p.id));
    if (selected.length === 0) return;
    onAddExistingPersons(selected);
    setSelectedPersonIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">إضافة مشاركين للفعالية</h2>
              <p className="text-xs text-gray-400">إدخال يدوي، لصق سريع، ملف Excel، أو من الدليل</p>
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
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-3 gap-1 overflow-x-auto">
          <button
            type="button"
            id="tab-new-person-btn"
            onClick={() => setTab('new')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              tab === 'new'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>شخص واحد</span>
          </button>

          <button
            type="button"
            id="tab-bulk-person-btn"
            onClick={() => setTab('bulk')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              tab === 'bulk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            <span>لصق قائمة أسماء</span>
          </button>

          <button
            type="button"
            id="tab-excel-person-btn"
            onClick={() => setTab('excel')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              tab === 'excel'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد إكسل</span>
          </button>

          <button
            type="button"
            id="tab-existing-person-btn"
            onClick={() => setTab('existing')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              tab === 'existing'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>من الدليل ({personList.length})</span>
          </button>
        </div>

        {/* Tab 1: Single Person Form */}
        {tab === 'new' && (
          <form onSubmit={handleAddNewSubmit} className="p-6 space-y-4">
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{validationError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="person-name-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: عبدالله محمد الهاجري"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رقم الجوال (اختياري)
                </label>
                <input
                  type="tel"
                  id="person-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رقم جوال STC (اختياري)
                </label>
                <input
                  type="tel"
                  id="person-stc-input"
                  value={stcNumber}
                  onChange={(e) => setStcNumber(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                البريد الإلكتروني (اختياري)
              </label>
              <input
                type="email"
                id="person-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-left"
                dir="ltr"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>سيتم حفظ بيانات الشخص تلقائياً في السحابة لاستخدامه في الفعاليات القادمة.</span>
            </div>

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

        {/* Tab 2: Bulk Paste */}
        {tab === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الصق قائمة الأسماء هنا (سطر لكل شخص) <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                يمكنك لصق الاسم فقط، أو الاسم مع رقم الجوال (مثال: محمد العمري 0501234567)
              </p>
              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`أحمد محمد القحطاني 0501112233\nسعد خالد الدوسري\nفهد بن عبدالعزيز 0554443322\nعبدالله الشهري`}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>

            {bulkError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{bulkError}</span>
              </div>
            )}

            <div className="pt-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-500">
                عدد الأسطر:{' '}
                <strong className="text-blue-600 font-mono">
                  {bulkText.split('\n').filter((l) => l.trim()).length}
                </strong>
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
                  type="submit"
                  disabled={!bulkText.trim()}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  إضافة جميع الأسماء
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Excel Upload */}
        {tab === 'excel' && (
          <div className="p-6 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-gray-50/50 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {excelFileName ? excelFileName : 'اضغط لاختيار ملف Excel أو CSV'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">يدعم صيغ .xlsx و .xls و .csv مع التعرف التلقائي على الأعمدة</p>
              </div>
            </div>

            {excelError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{excelError}</span>
              </div>
            )}

            {excelPreview.length > 0 && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    تم التعرف على {excelPreview.length} اسم بنجاح
                  </span>
                  <span className="font-mono text-emerald-700">جاهز للإضافة</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-gray-700 divide-y divide-emerald-100">
                  {excelPreview.slice(0, 10).map((p, idx) => (
                    <div key={idx} className="pt-1 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className="font-mono text-gray-500 text-[11px]" dir="ltr">{p.phone || p.stcNumber || '—'}</span>
                    </div>
                  ))}
                  {excelPreview.length > 10 && (
                    <p className="text-[11px] text-gray-500 pt-1 text-center font-medium">
                      + و {excelPreview.length - 10} أسماء أخرى...
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-500">
                المستخرج: <strong className="text-emerald-700 font-mono">{excelPreview.length}</strong> مشارك
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
                  disabled={excelPreview.length === 0}
                  onClick={handleConfirmExcel}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  إضافة ({excelPreview.length}) إلى الإيفنت
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Existing Persons List */}
        {tab === 'existing' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="search-existing-persons-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، رقم الجوال، أو جوال STC..."
                  className="w-full pr-9 pl-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={selectAllAvailable}
                className="px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-blue-200 shrink-0"
              >
                تحديد الكل
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100">
              {filteredExisting.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs font-medium">
                  لا توجد نتائج مطابقة للبحث
                </div>
              ) : (
                filteredExisting.map((person) => {
                  const isAlreadyInEvent = currentAttendeePersonIds.has(person.id);
                  const isSelected = selectedPersonIds.includes(person.id);

                  return (
                    <div
                      key={person.id}
                      onClick={() => !isAlreadyInEvent && toggleSelectExisting(person)}
                      className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between text-xs transition-all ${
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
                            {person.phone && <span className="font-mono">{person.phone}</span>}
                            {person.email && <span>• {person.email}</span>}
                          </div>
                        </div>
                      </div>

                      {person.stcNumber && (
                        <div className="text-left" dir="ltr">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-mono text-xs font-medium border border-gray-200">
                            {person.stcNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">
                تم تحديد <strong className="text-blue-600 font-mono">{selectedPersonIds.length}</strong> شخص
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
