import React from 'react';
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
  Cloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoPreset, ThemeColor } from '../types';

export const Navbar: React.FC = () => {
  const {
    events,
    persons,
    settings,
    setIsCreateEventOpen,
    isSyncing,
  } = useApp();
  const location = useLocation();

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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 sm:px-8 py-3 sm:py-3.5 flex justify-between items-center shrink-0 shadow-xs">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <Link to="/events" className="flex items-center gap-2.5 sm:gap-3.5 hover:opacity-90 transition-opacity shrink-0">
          {settings.logoType === 'custom' && settings.customLogoUrl ? (
            <img
              src={settings.customLogoUrl}
              alt="Logo"
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-xl border border-gray-200 shadow-xs p-1"
            />
          ) : (
            <div className={`w-10 h-10 sm:w-11 sm:h-11 ${getThemeBgColor(settings.themeColor)} rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0`}>
              {renderPresetLogoIcon(settings.presetIcon)}
            </div>
          )}
          <div className="hidden min-[380px]:block">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-extrabold leading-tight text-[#1A1A1A] max-w-[180px] sm:max-w-[280px] truncate">
                {settings.orgName || 'نظام إدارة الحضور'}
              </h1>
              <span className={`hidden lg:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border font-sans ${getThemeLightBgColor(settings.themeColor)}`}>
                معتمد
              </span>
            </div>
            <p className="text-[11px] text-gray-500 hidden md:block max-w-[280px] truncate">
              {settings.orgSubtitle || 'تسجيل الحضور الفوري والتقارير الرسمية'}
            </p>
          </div>
        </Link>

        {/* Navigation Pages */}
        <nav className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200">
          {/* Events Page Link */}
          <NavLink
            id="nav-events-page-link"
            to="/events"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isEventsActive
                ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                : 'text-gray-600 hover:text-[#1A1A1A] hover:bg-white/60'
            }`}
          >
            <Calendar className={`w-4 h-4 ${isEventsActive ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">الفعاليات</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] sm:text-xs bg-gray-200 text-gray-700 font-semibold font-mono">
              {(events || []).length}
            </span>
          </NavLink>

          {/* Directory Page Link */}
          <NavLink
            id="nav-directory-page-link"
            to="/people"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isDirectoryActive
                ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                : 'text-gray-600 hover:text-[#1A1A1A] hover:bg-white/60'
            }`}
          >
            <Users className={`w-4 h-4 ${isDirectoryActive ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">قاعدة البيانات</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] sm:text-xs bg-gray-200 text-gray-700 font-semibold font-mono">
              {(persons || []).length}
            </span>
          </NavLink>

          {/* Reports Page Link */}
          <NavLink
            id="nav-reports-page-link"
            to="/reports"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isReportsActive
                ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                : 'text-gray-600 hover:text-[#1A1A1A] hover:bg-white/60'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${isReportsActive ? 'text-blue-600' : 'text-gray-500'}`} />
            <span>التقارير</span>
          </NavLink>

          {/* Settings Page Link */}
          <NavLink
            id="nav-settings-page-link"
            to="/settings"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isSettingsActive
                ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                : 'text-gray-600 hover:text-[#1A1A1A] hover:bg-white/60'
            }`}
          >
            <SettingsIcon className={`w-4 h-4 ${isSettingsActive ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">الإعدادات</span>
          </NavLink>
        </nav>

        {/* Action Button & Direct Cloud Status */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold">سحابة فورية</span>
          </div>

          <button
            id="nav-create-event-btn"
            type="button"
            onClick={() => setIsCreateEventOpen(true)}
            className={`${getThemeBgColor(settings.themeColor)} text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold hover:opacity-90 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">إضافة إيفنت جديد</span>
            <span className="md:hidden">إيفنت جديد</span>
          </button>
        </div>
      </div>
    </header>
  );
};
