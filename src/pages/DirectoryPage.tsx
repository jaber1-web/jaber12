import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  FileSpreadsheet,
  Upload,
  Calendar,
  AlertCircle,
  X,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  LayoutGrid,
  List,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Person } from '../types';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';

export const DirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    persons,
    events,
    addPerson,
    updatePerson,
    deletePerson,
    importPersons,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPersonForHistory, setSelectedPersonForHistory] = useState<Person | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Form states for adding new person
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stcNumber, setStcNumber] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPersons = useMemo(() => {
    const list = persons || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      p =>
        p?.name?.toLowerCase().includes(q) ||
        (p?.phone && p.phone.includes(q)) ||
        (p?.stcNumber && p.stcNumber.toLowerCase().includes(q)) ||
        (p?.email && p.email.toLowerCase().includes(q))
    );
  }, [persons, searchQuery]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم الشخص');
      return;
    }

    addPerson({
      name: name.trim(),
      phone: phone.trim(),
      stcNumber: stcNumber.trim(),
      email: email.trim(),
    });

    setName('');
    setPhone('');
    setStcNumber('');
    setEmail('');
    setFormError('');
    setIsAddModalOpen(false);
  };

  const handleExportDirectoryExcel = () => {
    const data = persons.map((p, idx) => {
      const stats = getPersonHistoryStats(p.id);
      return {
        'م': idx + 1,
        'الاسم الكامل': p.name,
        'رقم الجوال': p.phone,
        'رقم جوال STC': p.stcNumber,
        'البريد الإلكتروني': p.email,
        'إجمالي الإيفنتات المسجل بها': stats.totalEvents,
        'عدد مرات الحضور الفعلية': stats.presentEvents,
        'نسبة الحضور': stats.totalEvents > 0 ? `${Math.round((stats.presentEvents / stats.totalEvents) * 100)}%` : '0%',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قاعدة بيانات المشاركين');
    XLSX.writeFile(workbook, `قاعدة_بيانات_المشاركين_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const imported: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        data.forEach((row: any) => {
          const personName = row['الاسم'] || row['الاسم الكامل'] || row['Name'] || row['name'];
          const personPhone = row['الجوال'] || row['رقم الجوال'] || row['Phone'] || row['phone'] || '';
          const personStc = row['STC'] || row['رقم STC'] || row['رقم جوال STC'] || row['stc'] || '';
          const personEmail = row['البريد'] || row['البريد الإلكتروني'] || row['Email'] || row['email'] || '';

          if (personName) {
            imported.push({
              name: String(personName).trim(),
              phone: String(personPhone).trim(),
              stcNumber: String(personStc).trim(),
              email: String(personEmail).trim(),
            });
          }
        });

        if (imported.length > 0) {
          importPersons(imported);
          alert(`تم استيراد ${imported.length} شخص بنجاح إلى قاعدة البيانات!`);
        } else {
          alert('لم يتم العثور على بيانات صالحة في الملف، تأكد من وجود عمود "الاسم" أو "الاسم الكامل"');
        }
      } catch {
        alert('حدث خطأ أثناء قراءة ملف Excel');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getPersonHistoryStats = (personId: string) => {
    let totalEvents = 0;
    let presentEvents = 0;

    (events || []).forEach(evt => {
      const att = (evt?.attendees || []).find(a => a?.personId === personId);
      if (att) {
        totalEvents++;
        if (att.status === 'present') {
          presentEvents++;
        }
      }
    });

    return { totalEvents, presentEvents };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 pb-24 sm:pb-20"
    >
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-500">
          <Link
            to="/events"
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <span>الفعاليات</span>
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[#1A1A1A] font-bold">قاعدة بيانات الأشخاص</span>
        </div>

        <button
          id="directory-breadcrumb-back-btn"
          onClick={() => navigate('/events')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-blue-600 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
          <span>رجوع للفعاليات</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-2xl font-bold text-[#1A1A1A]">
                قاعدة بيانات الأشخاص
              </h2>
              <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-bold border border-blue-100 font-mono">
                {(persons || []).length} شخص
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              إدارة جهات الاتصال الدائمة وأرقام جوال STC وسجل الحضور
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="استيراد Excel"
          >
            <Upload className="w-3.5 h-3.5 text-gray-600" />
            <span>استيراد</span>
          </button>

          <button
            type="button"
            onClick={handleExportDirectoryExcel}
            className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            id="add-new-person-btn"
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شخص جديد</span>
          </button>
        </div>
      </div>

      {/* Search & View Mode Controls */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="directory-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، الجوال، الإيميل، أو جوال STC..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
          />
        </div>

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
              title="عرض بطاقات الجوال"
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
              title="عرض جدول"
            >
              <List className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">جدول</span>
            </button>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            العدد: <span className="font-bold text-[#1A1A1A] font-mono">{filteredPersons.length}</span>
          </div>
        </div>
      </div>

      {/* Directory Content: Cards (Mobile Friendly) OR Table */}
      {viewMode === 'cards' ? (
        <div className="space-y-2.5">
          {filteredPersons.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 text-gray-400">
              <p className="font-semibold text-sm">لا توجد جهات اتصال مطابقة</p>
            </div>
          ) : (
            filteredPersons.map((person, index) => {
              const stats = getPersonHistoryStats(person.id);
              return (
                <div
                  key={person.id}
                  className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200 hover:border-gray-300 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {index + 1}
                      </span>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-[#1A1A1A] text-sm sm:text-base leading-tight truncate">
                          {person.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5 flex-wrap">
                          {person.phone && (
                            <a
                              href={`tel:${person.phone}`}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{person.phone}</span>
                            </a>
                          )}
                          {person.stcNumber && (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-[11px]">
                              STC: {person.stcNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingPerson(person)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف "${person.name}" من قاعدة البيانات؟`)) {
                            deletePerson(person.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedPersonForHistory(person)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 font-semibold cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{stats.presentEvents} / {stats.totalEvents} حضور</span>
                    </button>

                    {person.email ? (
                      <a
                        href={`mailto:${person.email}`}
                        className="text-gray-500 hover:text-blue-600 flex items-center gap-1 truncate max-w-[140px]"
                        dir="ltr"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{person.email}</span>
                      </a>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/80 text-xs font-bold text-gray-500 select-none">
                <tr>
                  <th className="px-4 py-3 border-b border-gray-100 w-10 text-center">م</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[160px]">الاسم الكامل</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[130px]">رقم الجوال</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[130px]">رقم جوال STC</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[160px] hidden md:table-cell">البريد</th>
                  <th className="px-4 py-3 border-b border-gray-100 min-w-[140px] text-center">سجل الفعاليات</th>
                  <th className="px-4 py-3 border-b border-gray-100 w-20 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPersons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <p className="font-semibold text-sm">لا توجد جهات اتصال مطابقة</p>
                    </td>
                  </tr>
                ) : (
                  filteredPersons.map((person, index) => {
                    const stats = getPersonHistoryStats(person.id);

                    return (
                      <tr key={person.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-gray-400 text-center">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-[#1A1A1A]">{person.name}</div>
                          <div className="text-[11px] text-gray-400 md:hidden flex items-center gap-1.5 mt-0.5" dir="ltr">
                            <span>{person.phone}</span>
                            {person.stcNumber && (
                              <span className="font-mono bg-gray-100 text-gray-700 px-1 py-0.2 rounded text-[10px]">
                                STC: {person.stcNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-gray-600 text-left" dir="ltr">
                          <div className="flex items-center justify-start gap-1">
                            {person.phone && (
                              <a
                                href={`tel:${person.phone}`}
                                className="p-1 rounded-md text-gray-400 hover:text-blue-600"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <span>{person.phone || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-gray-600 text-left" dir="ltr">
                          <div className="flex items-center justify-start gap-1">
                            {person.stcNumber && (
                              <a
                                href={`tel:${person.stcNumber}`}
                                className="p-1 rounded-md text-gray-400 hover:text-blue-600"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <span>{person.stcNumber || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-gray-500 text-left" dir="ltr">
                          {person.email || '-'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPersonForHistory(person)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 border border-gray-200"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{stats.presentEvents}/{stats.totalEvents}</span>
                          </button>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingPerson(person)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف "${person.name}" من قاعدة البيانات؟`)) {
                                  deletePerson(person.id);
                                }
                              }}
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

      {/* Modal: Add Person */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-base sm:text-lg text-[#1A1A1A]">إضافة شخص جديد</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: فهد محمد العتيبي"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم الجوال (اختياري)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0501234567"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم جوال STC (اختياري)</label>
                  <input
                    type="tel"
                    value={stcNumber}
                    onChange={e => setStcNumber(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  حفظ الشخص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Person */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-base sm:text-lg text-[#1A1A1A]">تعديل بيانات الشخص</h3>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                updatePerson(editingPerson);
                setEditingPerson(null);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={editingPerson.name}
                  onChange={e => setEditingPerson({ ...editingPerson, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={editingPerson.phone}
                    onChange={e => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم جوال STC *</label>
                  <input
                    type="tel"
                    required
                    value={editingPerson.stcNumber}
                    onChange={e => setEditingPerson({ ...editingPerson, stcNumber: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={editingPerson.email}
                  onChange={e => setEditingPerson({ ...editingPerson, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Person Event History */}
      {selectedPersonForHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#1A1A1A]">
                  سجل حضور: {selectedPersonForHistory.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  جوال: {selectedPersonForHistory.phone || '-'} | STC: {selectedPersonForHistory.stcNumber || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPersonForHistory(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {(events || [])
                .filter(e => (e?.attendees || []).some(a => a.personId === selectedPersonForHistory.id))
                .map(evt => {
                  const att = (evt?.attendees || []).find(a => a.personId === selectedPersonForHistory.id);
                  const isPresent = att?.status === 'present';
                  const isAbsent = att?.status === 'absent';

                  return (
                    <div
                      key={evt.id}
                      className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-xl"
                    >
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-[#1A1A1A]">{evt.title}</p>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">📅 {evt.date}</p>
                      </div>
                      <div>
                        {isPresent ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            حاضر
                          </span>
                        ) : isAbsent ? (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                            غائب
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium">
                            معلق
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={() => setSelectedPersonForHistory(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
