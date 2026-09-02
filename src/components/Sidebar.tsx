import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Building,
  Crown,
  Shield,
  Award,
  Star,
  Flame,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  CheckCircle2,
  Cloud,
  RefreshCw,
  Moon,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoPreset, ThemeColor } from '../types';

export const Sidebar: React.FC = () => {
  const {
    events,
    persons,
    settings,
    setIsCreateEventOpen,
    isSyncing,
    isCloudConnected,
    lastSyncedAt,
    syncNow,
    isDarkMode,
    toggleThemeMode,
  } = useApp();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isEventsActive =
    location.pathname === '/' ||
    location.pathname === '/events' ||
    location.pathname.startsWith('/events/');

  const isDirectoryActive = location.pathname.startsWith('/people');
  const isReportsActive = location.pathname.startsWith('/reports');
  const isSettingsActive = location.pathname.startsWith('/settings');

  const getThemeBgColor = (theme: ThemeColor) => {
    switch (theme) {
      case 'emerald': return 'bg-emerald-600';
      case 'violet': return 'bg-purple-600';
      case 'amber': return 'bg-amber-600';
      case 'slate': return 'bg-slate-700';
      case 'rose': return 'bg-rose-600';
      case 'teal': return 'bg-teal-600';
      case 'blue':
      default:
        return 'bg-blue-600';
    }
  };

  const getThemeActiveItemStyle = (theme: ThemeColor) => {
    switch (theme) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'violet': return 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
      case 'amber': return 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
      case 'slate': return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'teal': return 'bg-teal-50 text-teal-700 border-teal-200 font-bold';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
    }
  };

  const getThemeBottomNavActive = (theme: ThemeColor) => {
    switch (theme) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-purple-600';
      case 'amber': return 'text-amber-700';
      case 'slate': return 'text-slate-800';
      case 'rose': return 'text-rose-600';
      case 'teal': return 'text-teal-600';
      case 'blue':
      default:
        return 'text-blue-600';
    }
  };

  const getThemeLightBgColor = (theme: ThemeColor) => {
    switch (theme) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'violet': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'slate': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'teal': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getThemeIconColor = (theme: ThemeColor, isActive: boolean) => {
    if (!isActive) return 'text-gray-400 group-hover:text-gray-600';
    switch (theme) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-purple-600';
      case 'amber': return 'text-amber-600';
      case 'slate': return 'text-slate-700';
      case 'rose': return 'text-rose-600';
      case 'teal': return 'text-teal-600';
      case 'blue':
      default:
        return 'text-blue-600';
    }
  };

  const renderPresetLogoIcon = (preset: LogoPreset) => {
    switch (preset) {
      case 'crown': return <Crown className="w-5 h-5" />;
      case 'shield': return <Shield className="w-5 h-5" />;
      case 'award': return <Award className="w-5 h-5" />;
      case 'star': return <Star className="w-5 h-5" />;
      case 'users': return <Users className="w-5 h-5" />;
      case 'flame': return <Flame className="w-5 h-5" />;
      case 'sparkles': return <Sparkles className="w-5 h-5" />;
      case 'building':
      default:
        return <Building className="w-5 h-5" />;
    }
  };

  const navItems = [
    {
      id: 'sidebar-nav-events',
      to: '/events',
      title: 'الفعاليات والإيفنتات',
      shortTitle: 'الفعاليات',
      description: 'إدارة وجلسات الحضور',
      icon: Calendar,
      isActive: isEventsActive,
      badge: (events || []).length,
    },
    {
      id: 'sidebar-nav-people',
      to: '/people',
      title: 'قاعدة البيانات المركزية',
      shortTitle: 'الأشخاص',
      description: 'دليل الأشخاص والبيانات',
      icon: Users,
      isActive: isDirectoryActive,
      badge: (persons || []).length,
    },
    {
      id: 'sidebar-nav-reports',
      to: '/reports',
      title: 'التقارير والإحصائيات',
      shortTitle: 'التقارير',
      description: 'التصدير والطباعة والمشاركة',
      icon: BarChart3,
      isActive: isReportsActive,
      badge: null,
    },
    {
      id: 'sidebar-nav-settings',
      to: '/settings',
      title: 'إعدادات النظام',
      shortTitle: 'الإعدادات',
      description: 'الشعار والطباعة والهوية',
      icon: SettingsIcon,
      isActive: isSettingsActive,
      badge: null,
    },
  ];

  const handleNavClick = () => {
    setIsMobileOpen(false);
  };

  const totalPresentCount = (events || []).reduce((sum, e) => {
    return sum + ((e?.attendees || []).filter(a => a?.status === 'present').length || 0);
  }, 0);

  return (
    <>
      {/* Mobile Top App Bar (visible only on screens < lg) */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-3.5 py-2.5 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <button
            id="mobile-sidebar-toggle-btn"
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -mr-1 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
            aria-label="فتح القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/events" className="flex items-center gap-2 hover:opacity-90">
            {settings.logoType === 'custom' && settings.customLogoUrl ? (
              <img
                src={settings.customLogoUrl}
                alt="Logo"
                className="h-8 w-8 object-contain rounded-lg border border-gray-200 p-0.5"
              />
            ) : (
              <div className={`w-8 h-8 ${getThemeBgColor(settings.themeColor)} rounded-lg flex items-center justify-center text-white font-bold shadow-xs`}>
                {renderPresetLogoIcon(settings.presetIcon)}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="text-xs sm:text-sm font-extrabold text-[#1A1A1A] block max-w-[140px] sm:max-w-[200px] truncate leading-tight">
                {settings.orgName || 'نظام إدارة الحضور'}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleThemeMode()}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200 shadow-2xs"
            title={isDarkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي الداكن'}
            aria-label="تبديل وضع الإضاءة"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className="flex items-center gap-1 p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            title="تحديث ومزامنة السحابة فوراً"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="mobile-create-event-btn"
            type="button"
            onClick={() => setIsCreateEventOpen(true)}
            className={`${getThemeBgColor(settings.themeColor)} text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-xs cursor-pointer active:scale-95`}
          >
            <Plus className="w-4 h-4" />
            <span>إيفنت جديد</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Desktop Fixed Right + Mobile Slide Drawer) */}
      <aside
        id="app-main-sidebar"
        className={`fixed top-0 bottom-0 right-0 z-50 w-72 sm:w-80 bg-white border-l border-gray-200 flex flex-col justify-between transition-transform duration-300 ease-out shadow-2xl lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link
              to="/events"
              onClick={handleNavClick}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              {settings.logoType === 'custom' && settings.customLogoUrl ? (
                <img
                  src={settings.customLogoUrl}
                  alt="Logo"
                  className="h-11 w-11 object-contain rounded-xl border border-gray-200 shadow-xs p-1"
                />
              ) : (
                <div className={`w-11 h-11 ${getThemeBgColor(settings.themeColor)} rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0`}>
                  {renderPresetLogoIcon(settings.presetIcon)}
                </div>
              )}
              <div className="overflow-hidden">
                <h1 className="text-sm font-extrabold text-[#1A1A1A] truncate max-w-[160px]">
                  {settings.orgName || 'نظام إدارة الحضور'}
                </h1>
                <p className="text-[11px] text-gray-500 truncate max-w-[160px]">
                  {settings.orgSubtitle || 'تسجيل الحضور والتقارير'}
                </p>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer active:scale-95"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Create Event Button */}
          <button
            id="sidebar-create-event-btn"
            type="button"
            onClick={() => {
              setIsCreateEventOpen(true);
              setIsMobileOpen(false);
            }}
            className={`w-full ${getThemeBgColor(settings.themeColor)} text-white py-2.5 px-4 rounded-xl text-sm font-bold hover:opacity-90 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إيفنت جديد</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            القائمة الرئيسية
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                id={item.id}
                to={item.to}
                onClick={handleNavClick}
                className={`group flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                  item.isActive
                    ? getThemeActiveItemStyle(settings.themeColor)
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      item.isActive
                        ? 'bg-white shadow-2xs'
                        : 'bg-gray-100 group-hover:bg-gray-200/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${getThemeIconColor(settings.themeColor, item.isActive)}`} />
                  </div>
                  <div className="text-right">
                    <div className="font-bold leading-tight">{item.title}</div>
                    <div className="text-[11px] text-gray-400 group-hover:text-gray-500 font-normal leading-tight mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                        item.isActive
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronLeft className={`w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-transform ${item.isActive ? 'text-blue-500 -translate-x-0.5' : ''}`} />
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer Summary */}
        <div className="p-3.5 border-t border-gray-100 bg-gray-50/70 m-2 rounded-xl space-y-2.5">
          {/* Cloud Status */}
          <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="overflow-hidden text-right">
                <div className="text-[11px] font-bold text-gray-800 leading-tight flex items-center gap-1">
                  <span>سحابة Firestore المباشرة</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="متصل"></span>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                  {isSyncing ? (
                    <span className="text-blue-600 font-medium">جاري المزامنة...</span>
                  ) : lastSyncedAt ? (
                    <span className="text-emerald-700 font-medium">بياناتك محفوظة سحابياً {lastSyncedAt}</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">مزامنة فورية بدون تسجيل</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => syncNow()}
                disabled={isSyncing}
                title="تحديث المزامنة السحابية فوراً"
                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Dark Mode Switch */}
          <button
            type="button"
            onClick={() => toggleThemeMode()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-gray-200/80 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer group"
            title={isDarkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي'}
          >
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-100 text-slate-700'}`}>
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs font-bold text-gray-700">
                {isDarkMode ? 'الوضع الليلي الفاخر' : 'الوضع الفاتح الناصع'}
              </span>
            </div>
            <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${isDarkMode ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs"></div>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-gray-200/80 shadow-2xs">
              <div className="text-gray-400 text-[10px]">الفعاليات</div>
              <div className="font-extrabold text-gray-800 font-mono text-sm">{(events || []).length}</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200/80 shadow-2xs">
              <div className="text-gray-400 text-[10px]">إجمالي الحضور</div>
              <div className="font-extrabold text-emerald-700 font-mono text-sm">{totalPresentCount}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Quick thumbs access on small screens) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex justify-around items-center shadow-lg pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`bottom-${item.id}`}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[11px] font-bold transition-all relative ${
                item.isActive
                  ? `${getThemeBottomNavActive(settings.themeColor)} bg-gray-50/80`
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-blue-600 text-white font-mono text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="leading-none">{item.shortTitle}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
