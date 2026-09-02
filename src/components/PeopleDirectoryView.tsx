import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Person, EventItem } from '../types';

interface PeopleDirectoryViewProps {
  persons: Person[];
  events: EventItem[];
  onBack?: () => void;
  onAddPerson: (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdatePerson: (person: Person) => void;
  onDeletePerson: (personId: string) => void;
}

export const PeopleDirectoryView: React.FC<PeopleDirectoryViewProps> = ({
  persons,
  events,
  onBack,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  // Form states for adding
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stcNumber, setStcNumber] = useState('');
  const [formError, setFormError] = useState('');

  // Calculate stats for each person (e.g. how many events attended)
  const personStats = useMemo(() => {
    const map = new Map<string, { totalEvents: number; presentEvents: number }>();
    (events || []).forEach(evt => {
      (evt?.attendees || []).forEach(a => {
        const current = map.get(a.personId) || { totalEvents: 0, presentEvents: 0 };
        current.totalEvents += 1;
        if (a.status === 'present') {
          current.presentEvents += 1;
        }
        map.set(a.personId, current);
      });
    });
    return map;
  }, [events]);

  const filteredPersons = useMemo(() => {
    const list = persons || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(p =>
      p?.name?.toLowerCase().includes(q) ||
      (p?.phone && p.phone.includes(q)) ||
      (p?.stcNumber && p.stcNumber.toLowerCase().includes(q)) ||
      (p?.email && p.email.toLowerCase().includes(q))
    );
  }, [persons, searchQuery]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم الشخص');
      return;
    }
    if (!phone.trim() && !stcNumber.trim()) {
      setFormError('يرجى إدخال رقم الجوال أو رقم جوال STC');
      return;
    }

    onAddPerson({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      stcNumber: stcNumber.trim(),
    });

    setName('');
    setEmail('');
    setPhone('');
    setStcNumber('');
    setFormError('');
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    if (!editingPerson.name.trim()) return;

    onUpdatePerson(editingPerson);
    setEditingPerson(null);
  };

  const exportDirectoryToExcel = () => {
    const rows = persons.map((p, idx) => {
      const stats = personStats.get(p.id) || { totalEvents: 0, presentEvents: 0 };
      return {
        'م': idx + 1,
        'الاسم الكامل': p.name,
        'رقم الجوال': p.phone,
        'رقم جوال STC': p.stcNumber,
        'البريد الإلكتروني': p.email,
        'إجمالي الإيفنتات المسجل بها': stats.totalEvents,
        'عدد مرات الحضور الفعلية': stats.presentEvents,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ RTL: true });
    XLSX.utils.book_append_sheet(wb, ws, 'قاعدة بيانات الأشخاص');
    XLSX.writeFile(wb, `دليل_الأشخاص_المحفوظين_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb with Back Action */}
      {onBack && (
        <div className="flex items-center justify-between gap-2">
          <button
            id="directory-breadcrumb-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-blue-600 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <span>رجوع إلى قائمة الفعاليات</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl border border-gray-300 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold shrink-0 shadow-2xs active:scale-95 cursor-pointer sm:hidden"
              title="رجوع"
            >
              <ArrowRight className="w-4 h-4 text-gray-700" />
              <span>رجوع</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
              قاعدة بيانات الأشخاص
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              يتم حفظ جميع الأشخاص هنا تلقائياً لسرعة استدعائهم في أي إيفنت جديد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={exportDirectoryToExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span>تصدير (Excel)</span>
          </button>

          <button
            type="button"
            id="open-create-person-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة شخص جديد</span>
          </button>
        </div>
      </div>

      {/* Database View Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              id="directory-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الجوال، الإيميل، أو جوال STC..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
            />
          </div>

          <div className="text-xs text-gray-500 font-medium">
            إجمالي الأشخاص: <strong className="text-[#1A1A1A] font-mono text-sm">{filteredPersons.length}</strong>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-bold border-b border-gray-100">
                <th className="px-6 py-3.5 border-b border-gray-100 w-12 text-center">م</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[180px]">الاسم الكامل</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[140px]">رقم الجوال</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[140px]">رقم جوال STC</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[180px] hidden md:table-cell">البريد الإلكتروني</th>
                <th className="px-6 py-3.5 border-b border-gray-100 min-w-[160px] text-center">سجل الفعاليات</th>
                <th className="px-6 py-3.5 border-b border-gray-100 w-24 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50 bg-white">
              {filteredPersons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium">لا يوجد أشخاص محفوظين يطابقون البحث</p>
                  </td>
                </tr>
              ) : (
                filteredPersons.map((person, index) => {
                  const stats = personStats.get(person.id) || { totalEvents: 0, presentEvents: 0 };

                  return (
                    <tr key={person.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-center font-mono text-xs text-gray-400 font-semibold">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#1A1A1A]">{person.name}</div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-gray-600 text-left" dir="ltr">
                        <div className="flex items-center justify-start gap-1.5">
                          <a
                            href={`tel:${person.phone}`}
                            className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="اتصال مباشر"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <span>{person.phone || '-'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-gray-600 text-left" dir="ltr">
                        <div className="flex items-center justify-start gap-1.5">
                          {person.stcNumber && (
                            <a
                              href={`tel:${person.stcNumber}`}
                              className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="اتصال مباشر برقم STC"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <span>{person.stcNumber || '-'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 hidden md:table-cell font-mono text-xs text-gray-500 text-left" dir="ltr">
                        {person.email || '-'}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{stats.totalEvents} إيفنتات</span>
                          <span className="text-green-600 font-bold">({stats.presentEvents} حاضر)</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingPerson(person)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                            title="تعديل بيانات الشخص"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف ${person.name} من قاعدة البيانات؟`)) {
                                onDeletePerson(person.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف الشخص نهائياً"
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

      {/* Modal: Add Person to Database */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#1A1A1A] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">إضافة شخص جديد إلى قاعدة البيانات</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: محمد علي الغامدي"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left text-[#1A1A1A]"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم جوال STC *</label>
                  <input
                    type="tel"
                    required
                    value={stcNumber}
                    onChange={e => setStcNumber(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left font-mono text-[#1A1A1A]"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  حفظ في الدليل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Person in Database */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#1A1A1A] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">تعديل بيانات الشخص في الدليل</h3>
              <button onClick={() => setEditingPerson(null)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
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
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={editingPerson.email}
                  onChange={e => setEditingPerson({ ...editingPerson, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left text-[#1A1A1A]"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    required
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
              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
