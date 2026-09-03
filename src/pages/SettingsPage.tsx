import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Building,
  Crown,
  Shield,
  Award,
  Users,
  Star,
  Flame,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Palette,
  Printer,
  Volume2,
  VolumeX,
  PartyPopper,
  Download,
  UploadCloud,
  RotateCcw,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Link as LinkIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { ThemeColor, LogoPreset, ThemeMode, FontSizePreference } from '../types';
import { playAttendanceFeedback } from '../utils/storage';
import { motion } from 'motion/react';

const SETTINGS_ACCESS_PASSWORD = 'Aa@000j000';
const SETTINGS_AUTH_SESSION_KEY = 'settings_unlocked_session_v1';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    events,
    isSyncing,
    lastSyncedAt,
    syncNow,
    exportAllBackupData,
    importBackupData,
    resetToDefaultData,
    clearAllData,
  } = useApp();

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SETTINGS_AUTH_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<'brand' | 'theme' | 'print' | 'ux' | 'data'>('brand');
  const [saveToast, setSaveToast] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [logoError, setLogoError] = useState<string>('');
  const [logoSuccess, setLogoSuccess] = useState<string>('');
  const [isOptimizingLogo, setIsOptimizingLogo] = useState<boolean>(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [directLogoUrl, setDirectLogoUrl] = useState<string>('');
  const [logoPreviewBg, setLogoPreviewBg] = useState<'white' | 'dark'>('white');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUnlocked && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [isUnlocked]);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === SETTINGS_ACCESS_PASSWORD) {
      try {
        sessionStorage.setItem(SETTINGS_AUTH_SESSION_KEY, 'true');
      } catch {
        // ignore
      }
      setIsUnlocked(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة');
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
        passwordInputRef.current.select();
      }
    }
  };

  const handleLockSettings = () => {
    try {
      sessionStorage.removeItem(SETTINGS_AUTH_SESSION_KEY);
    } catch {
      // ignore
    }
    setIsUnlocked(false);
    setPasswordInput('');
    setPasswordError('');
  };

  const showSavedNotification = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2200);
  };

  // Process & Optimize Image via Canvas (prevents localStorage quota issues and guarantees crisp loading)
  const processAndOptimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // SVGs are vector and can be read directly as DataURL
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Downscale to max 640px dimension while keeping aspect ratio
          const maxDimension = 640;
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
          
          let format = 'image/jpeg';
          let quality = 0.9;
          if (isPng) {
            format = 'image/png';
          } else if (isWebp) {
            format = 'image/webp';
          }

          const optimized = canvas.toDataURL(format, quality);
          resolve(optimized);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process selected or dropped file
  const handleLogoFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.match(/\.(png|jpg|jpeg|svg|webp|gif)$/i)) {
      setLogoError('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      setTimeout(() => setLogoError(''), 4000);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setLogoError('حجم الصورة كبير، يرجى اختيار صورة أقل من 20 ميغابايت');
      setTimeout(() => setLogoError(''), 4000);
      return;
    }

    try {
      setIsOptimizingLogo(true);
      setLogoError('');
      const optimizedBase64 = await processAndOptimizeImage(file);
      updateSettings({
        customLogoUrl: optimizedBase64,
        logoType: 'custom',
      });
      showSavedNotification();
      setLogoSuccess('تم تعيين الشعار وحفظه بنجاح!');
      setTimeout(() => setLogoSuccess(''), 4500);
    } catch (err) {
      console.error('Failed to process logo:', err);
      setLogoError('حدث خطأ أثناء معالجة الصورة، يرجى تجربة صورة أخرى');
    } finally {
      setIsOptimizingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file input change
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoFile(file);
    }
  };

  // Apply direct image URL
  const handleApplyLogoUrl = () => {
    if (!directLogoUrl.trim()) return;
    updateSettings({
      customLogoUrl: directLogoUrl.trim(),
      logoType: 'custom',
    });
    showSavedNotification();
    setLogoSuccess('تم اعتماد رابط الشعار وحفظه بنجاح!');
    setShowUrlInput(false);
    setDirectLogoUrl('');
    setTimeout(() => setLogoSuccess(''), 4500);
  };

  const removeCustomLogo = () => {
    updateSettings({
      customLogoUrl: '',
      logoType: 'preset',
    });
    showSavedNotification();
    setLogoSuccess('تمت إزالة الشعار واستعادة الرمز الرسمي');
    setTimeout(() => setLogoSuccess(''), 3000);
  };

  // Support pasting image anywhere on settings page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleLogoFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Test Sound
  const handleTestSound = () => {
    playAttendanceFeedback('present', true);
  };

  // Test Confetti
  const handleTestConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Backup Export
  const handleExportBackup = () => {
    const data = exportAllBackupData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة_احتياطية_نظام_الحضور_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Backup Restore
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        const res = await importBackupData(parsed);
        setBackupMessage({ text: res.message, success: res.success });
      } catch {
        setBackupMessage({ text: 'فشل في قراءة ملف النسخة الاحتياطية', success: false });
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = async () => {
    await resetToDefaultData();
    setConfirmResetOpen(false);
    showSavedNotification();
  };

  const handleClearAll = async () => {
    await clearAllData();
    setConfirmClearOpen(false);
    showSavedNotification();
  };

  const presetIconsList: { id: LogoPreset; name: string; icon: React.ReactNode }[] = [
    { id: 'building', name: 'منشأة رسمية', icon: <Building className="w-5 h-5" /> },
    { id: 'crown', name: 'تاج قيادي', icon: <Crown className="w-5 h-5" /> },
    { id: 'shield', name: 'درع الحماية', icon: <Shield className="w-5 h-5" /> },
    { id: 'award', name: 'وسام التميز', icon: <Award className="w-5 h-5" /> },
    { id: 'star', name: 'نجمة الجودة', icon: <Star className="w-5 h-5" /> },
    { id: 'users', name: 'فريق العمل', icon: <Users className="w-5 h-5" /> },
    { id: 'flame', name: 'شعلة النشاط', icon: <Flame className="w-5 h-5" /> },
    { id: 'sparkles', name: 'بريق الإنجاز', icon: <Sparkles className="w-5 h-5" /> },
  ];

  const themeColorsList: { id: ThemeColor; name: string; bg: string; border: string; desc: string }[] = [
    { id: 'monochrome', name: 'الأسود الملكي (مونوكروم)', bg: 'bg-black text-white dark:bg-zinc-100 dark:text-zinc-950', border: 'border-black dark:border-white', desc: 'مثالي للشعار الأسود والأبيض' },
    { id: 'slate', name: 'التيتانيوم العصري', bg: 'bg-slate-700', border: 'border-slate-700', desc: 'رمادي داكن ورسمي' },
    { id: 'blue', name: 'الأزرق الكلاسيكي', bg: 'bg-blue-600', border: 'border-blue-600', desc: 'اللون الافتراضي المعتمد' },
    { id: 'emerald', name: 'الأخضر الزمردي', bg: 'bg-emerald-600', border: 'border-emerald-600', desc: 'حيوي وطبيعي' },
    { id: 'violet', name: 'البنفسجي الملكي', bg: 'bg-purple-600', border: 'border-purple-600', desc: 'أنيق ومميز' },
    { id: 'amber', name: 'الكحلي والذهبي', bg: 'bg-amber-600', border: 'border-amber-600', desc: 'دافئ وجذاب' },
    { id: 'rose', name: 'العنابي الراقي', bg: 'bg-rose-600', border: 'border-rose-600', desc: 'فاخر وحصري' },
    { id: 'teal', name: 'التيل الهادئ', bg: 'bg-teal-600', border: 'border-teal-600', desc: 'عصري وهادئ' },
  ];

  if (!isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="min-h-[70vh] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Decorative background aura */}
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] mb-2">
            صفحة الإعدادات محمية
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-6">
            يرجى إدخال كلمة المرور المعتمدة للوصول إلى إعدادات النظام وتخصيص الهوية والنسخ الاحتياطي
          </p>

          <form onSubmit={handleUnlockSubmit} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="أدخل كلمة المرور..."
                  dir="ltr"
                  className={`w-full px-4 py-3 pl-11 rounded-xl border text-sm font-mono tracking-wider transition-all outline-none text-left ${
                    passwordError
                      ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-200'
                      : 'border-gray-300 bg-gray-50/60 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs font-bold text-rose-600 mt-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>دخول الإعدادات</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/events')}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة للفعاليات</span>
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>نظام الحماية والتحقق الأمني مفعل</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-24"
    >
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 shadow-2xs">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
                إعدادات النظام وتخصيص الهوية
              </h2>
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-md font-bold border border-emerald-100 flex items-center gap-1">
                <Check className="w-3 h-3" />
                حفظ فوري تلقائي
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              تخصيص الشعار، الثيمات، ترويسة التقارير المطبوعة وخيارات النسخ الاحتياطي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {saveToast && (
            <span className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم الحفظ بنجاح
            </span>
          )}
          <button
            type="button"
            onClick={handleLockSettings}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="قفل صفحة الإعدادات"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>قفل الإعدادات</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/events')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            الرجوع للفعاليات
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('brand')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'brand'
              ? 'bg-white text-[#1A1A1A] shadow-xs'
              : 'text-gray-600 hover:text-[#1A1A1A]'
          }`}
        >
          <Building className="w-4 h-4 text-blue-600" />
          <span>الهوية والشعار</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'theme'
              ? 'bg-white text-[#1A1A1A] shadow-xs'
              : 'text-gray-600 hover:text-[#1A1A1A]'
          }`}
        >
          <Palette className="w-4 h-4 text-purple-600" />
          <span>الثيمات والألوان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('print')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'print'
              ? 'bg-white text-[#1A1A1A] shadow-xs'
              : 'text-gray-600 hover:text-[#1A1A1A]'
          }`}
        >
          <Printer className="w-4 h-4 text-emerald-600" />
          <span>إعدادات الطباعة و PDF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ux')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'ux'
              ? 'bg-white text-[#1A1A1A] shadow-xs'
              : 'text-gray-600 hover:text-[#1A1A1A]'
          }`}
        >
          <PartyPopper className="w-4 h-4 text-amber-600" />
          <span>تفضيلات التحضير والصوت</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'data'
              ? 'bg-white text-[#1A1A1A] shadow-xs'
              : 'text-gray-600 hover:text-[#1A1A1A]'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-indigo-600" />
          <span>النسخ الاحتياطي والبيانات</span>
        </button>
      </div>

      {/* Tab 1: Branding & Logo */}
      {activeTab === 'brand' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo Settings */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <span>شعار المنشأة أو النظام</span>
              </h3>

              <div className="space-y-4 pt-1">
                {/* Upload or View Custom Logo */}
                {settings.customLogoUrl && settings.logoType === 'custom' ? (
                  <div className="bg-gray-50/80 dark:bg-slate-900/60 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Logo Preview with White/Dark test canvas */}
                      <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">الشعار النشط حالياً:</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            مفعّل ومعتمد
                          </span>
                        </div>
                        
                        {/* Background Switcher for B&W logos */}
                        <div className="flex items-center gap-1 bg-gray-200 dark:bg-slate-800 p-1 rounded-xl text-xs">
                          <span className="text-[10px] text-gray-500 px-2">معاينة على خلفية:</span>
                          <button
                            type="button"
                            onClick={() => setLogoPreviewBg('white')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              logoPreviewBg === 'white'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-gray-600 hover:text-slate-900'
                            }`}
                          >
                            ⚪ بيضاء
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoPreviewBg('dark')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              logoPreviewBg === 'dark'
                                ? 'bg-slate-950 text-white shadow-xs'
                                : 'text-gray-600 hover:text-slate-900'
                            }`}
                          >
                            ⚫ داكنة
                          </button>
                        </div>
                      </div>

                      {/* Display Image Box */}
                      <div
                        className={`w-full sm:w-48 h-28 rounded-xl border flex items-center justify-center p-3 transition-colors ${
                          logoPreviewBg === 'dark'
                            ? 'bg-zinc-950 border-zinc-800 shadow-inner'
                            : 'bg-white border-gray-200 shadow-xs'
                        }`}
                      >
                        <img
                          src={settings.customLogoUrl}
                          alt="Custom Brand Logo"
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      </div>
                    </div>

                    {/* Actions on active logo */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isOptimizingLogo}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isOptimizingLogo ? 'animate-spin' : ''}`} />
                          <span>استبدال بصورة أخرى</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>رابط URL</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={removeCustomLogo}
                        className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إزالة الشعار المخصص والعودة للرموز</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Drag & Drop Upload Zone */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(true);
                    }}
                    onDragLeave={() => setIsDraggingLogo(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleLogoFile(file);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center transition-all ${
                      isDraggingLogo
                        ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800 scale-[1.01]'
                        : 'border-gray-300 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                    />

                    <div className="w-14 h-14 rounded-2xl bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center mb-3">
                      {isOptimizingLogo ? (
                        <RefreshCw className="w-7 h-7 animate-spin" />
                      ) : (
                        <Upload className="w-7 h-7" />
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      {isOptimizingLogo ? 'جاري معالجة وتثبيت الشعار...' : 'رفع شعار المنشأة (أسود وأبيض أو ملون)'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
                      اسحب الملف وأفلته هنا، أو الصق من الحافظة (Ctrl+V)، أو انقر للتصفح. ندعم صيغ PNG, SVG, JPG, WebP.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        disabled={isOptimizingLogo}
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 dark:text-slate-950 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        اختيار صورة من الجهاز
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="border border-gray-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>إدخال رابط مباشر</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct URL Input Row */}
                {showUrlInput && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-900/80 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      أدخل رابط صورة الشعار المباشر (Direct Image URL):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={directLogoUrl}
                        onChange={(e) => setDirectLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      />
                      <button
                        type="button"
                        onClick={handleApplyLogoUrl}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                      >
                        اعتماد
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(false)}
                        className="text-gray-500 hover:text-gray-700 text-xs px-2 cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {logoError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{logoError}</span>
                  </div>
                )}
                {logoSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{logoSuccess}</span>
                  </div>
                )}

                {/* Preset Icons Picker as fallback */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">أو اختر رمزاً رسمياً جاهزاً:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {presetIconsList.map(item => {
                      const isSelected = settings.logoType === 'preset' && settings.presetIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            updateSettings({
                              presetIcon: item.id,
                              logoType: 'preset',
                            });
                            showSavedNotification();
                          }}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-bold dark:bg-zinc-100 dark:text-zinc-950 dark:border-white'
                              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white dark:text-zinc-950' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'}`}>
                            {item.icon}
                          </div>
                          <span className="text-xs">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Show logo toggle */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">إظهار الشعار في ترويسة التقارير المطبوعة</span>
                  <span className="text-xs text-gray-400">طباعة الشعار الرسمي في أعلى الصفحة الأولى من ملفات PDF</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showLogoInReports}
                    onChange={e => {
                      updateSettings({ showLogoInReports: e.target.checked });
                      showSavedNotification();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Organization Info Form */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#1A1A1A]">
                بيانات المنشأة والجهة المنظمة
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    اسم المنشأة / الجهة / النظام <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.orgName}
                    onChange={e => {
                      updateSettings({ orgName: e.target.value });
                      showSavedNotification();
                    }}
                    placeholder="مثال: نظام إدارة الحضور والفعاليات"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    العنوان الفرعي / الإدارة أو القسم
                  </label>
                  <input
                    type="text"
                    value={settings.orgSubtitle}
                    onChange={e => {
                      updateSettings({ orgSubtitle: e.target.value });
                      showSavedNotification();
                    }}
                    placeholder="مثال: الإدارة العامة لتنظيم الفعاليات والمؤتمرات"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    اسم المسؤول المعتمد / صفة المصادقة في التقارير
                  </label>
                  <input
                    type="text"
                    value={settings.authorizedSigner}
                    onChange={e => {
                      updateSettings({ authorizedSigner: e.target.value });
                      showSavedNotification();
                    }}
                    placeholder="مثال: مدير عام الفعاليات / عبدالمحسن الفهد"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">يظهر هذا الاسم تلقائياً تحت خانة الختم والاعتماد في تقارير PDF المطبوعة.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Live Visual Preview */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-slate-800 dark:text-slate-200" />
              <span>معاينة حية لترويسة التقرير المطبوع</span>
            </h3>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-800 dark:border-slate-200">
                <div className="flex items-center gap-3">
                  {settings.showLogoInReports && (
                    settings.logoType === 'custom' && settings.customLogoUrl ? (
                      <div className="max-h-12 max-w-[100px] flex items-center justify-center p-1 bg-white/10 rounded">
                        <img
                          src={settings.customLogoUrl}
                          alt="Logo"
                          className="max-h-11 max-w-[90px] object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-900 dark:text-slate-100">
                        {presetIconsList.find(p => p.id === settings.presetIcon)?.icon || <Building className="w-5 h-5" />}
                      </div>
                    )
                  )}
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {settings.orgName || 'نظام إدارة الحضور والفعاليات'}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {settings.orgSubtitle || 'تقرير الحضور الرسمي المعتمد'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-3 text-xs space-y-1.5 text-gray-600 dark:text-gray-300">
                <div className="flex justify-between font-bold text-gray-800">
                  <span>الفعالية: ملتقى القيادات والمبتكرين</span>
                  <span className="text-emerald-600 font-mono">حضور: 85%</span>
                </div>
                <div className="text-[11px] text-gray-400">
                  الموقع: الرياض • التاريخ: اليوم
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
                <span>{settings.orgName}</span>
                <span>تاريخ الاستخراج: اليوم</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Themes & Appearance */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          {/* Color Presets */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">
                ألوان وسمات النظام (Theme Presets)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                اختر الثيم المفضل لتلوين الأزرار، علامات التبويب، ونقاط التمييز في كامل الموقع
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {themeColorsList.map(theme => {
                const isSelected = settings.themeColor === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      updateSettings({ themeColor: theme.id });
                      showSavedNotification();
                    }}
                    className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-900 border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 shadow-xs'
                        : 'bg-white dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl ${theme.bg} shadow-2xs flex items-center justify-center shrink-0 border border-black/10 dark:border-white/10`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className={`text-xs sm:text-sm font-bold block ${isSelected ? 'text-slate-950 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                          {theme.name}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-400 block mt-0.5">
                          {theme.desc}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode & Font Preference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mode */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white">
                وضع الإضاءة
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'light', name: 'فاتح ناصع ☀️' },
                  { id: 'dark', name: 'داكن مريح 🌙' },
                  { id: 'system', name: 'تلقائي 💻' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      updateSettings({ mode: m.id as ThemeMode });
                      showSavedNotification();
                    }}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      settings.mode === m.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-zinc-100 dark:text-zinc-950 dark:border-white'
                        : 'bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Scale */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white">
                حجم العرض والخطوط
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'compact', name: 'مدمج (Compact)' },
                  { id: 'normal', name: 'قياسي (Default)' },
                  { id: 'comfortable', name: 'مريح (Large)' },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      updateSettings({ fontSize: f.id as FontSizePreference });
                      showSavedNotification();
                    }}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      settings.fontSize === f.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-zinc-100 dark:text-zinc-950 dark:border-white'
                        : 'bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Print & PDF Settings */}
      {activeTab === 'print' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              <span>إعدادات وتخصيص تقارير الطباعة و PDF</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  عنوان الترويسة الافتراضي للتقرير
                </label>
                <input
                  type="text"
                  value={settings.printHeaderTitle}
                  onChange={e => {
                    updateSettings({ printHeaderTitle: e.target.value });
                    showSavedNotification();
                  }}
                  placeholder="مثال: تقرير حضور وانصراف فعالية معتمد"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ملاحظة تذييل الصفحة الرسمية (Footer Note)
                </label>
                <input
                  type="text"
                  value={settings.printFooterNote}
                  onChange={e => {
                    updateSettings({ printFooterNote: e.target.value });
                    showSavedNotification();
                  }}
                  placeholder="مثال: يعتبر هذا التقرير مستنداً رسمياً معتمداً من إدارة الفعالية تم استخراجه آلياً."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Checkboxes for print columns & sections */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <span className="text-xs font-bold text-gray-800 block">خيارات كشف الحضور:</span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeStatsInPrint}
                    onChange={e => {
                      updateSettings({ includeStatsInPrint: e.target.checked });
                      showSavedNotification();
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">شريط ملخص الأرقام</span>
                    <span className="text-[11px] text-gray-400">إجمالي الحضور والغياب</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeStcInPrint}
                    onChange={e => {
                      updateSettings({ includeStcInPrint: e.target.checked });
                      showSavedNotification();
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">عمود رقم STC</span>
                    <span className="text-[11px] text-gray-400">إظهار أرقام STC إن وجدت</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeEmailInPrint}
                    onChange={e => {
                      updateSettings({ includeEmailInPrint: e.target.checked });
                      showSavedNotification();
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">عمود البريد الإلكتروني</span>
                    <span className="text-[11px] text-gray-400">إظهار البريد الإلكتروني</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Attendance & UX Preferences */}
      {activeTab === 'ux' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sound Feedback */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                  <h3 className="font-bold text-base text-[#1A1A1A]">المؤثرات الصوتية للتحضير</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={e => {
                      updateSettings({ soundEnabled: e.target.checked });
                      showSavedNotification();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                إصدار نغمة تأكيد لطيفة وسريعة فور نقر زر "حاضر" أو "غائب" لضمان سرعة التحضير الميداني.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestSound}
              className="w-full mt-4 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>تجربة نغمة التحضير الآن</span>
            </button>
          </div>

          {/* Confetti Celebration */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PartyPopper className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-base text-[#1A1A1A]">تأثيرات الاحتفال (Confetti)</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.confettiEnabled}
                    onChange={e => {
                      updateSettings({ confettiEnabled: e.target.checked });
                      showSavedNotification();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                إطلاق قصاصات الاحتفال التفاعلية المبهجة عند تحضير الأشخاص أو تحضير كامل القائمة بنجاح.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestConfetti}
              className="w-full mt-4 bg-amber-50 hover:bg-amber-100 text-amber-800 py-2.5 rounded-xl text-xs font-bold transition-all border border-amber-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <PartyPopper className="w-4 h-4" />
              <span>تجربة تأثيرات الاحتفال الآن 🎉</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Data Backup & Management */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Cloud Database Status Card */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-blue-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0 border border-white/10">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">قاعدة بيانات Firebase Cloud Firestore</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-400/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      متصل ومزامن سحابياً
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-1">
                    يتم حفظ واسترجاع كافة الفعاليات والأشخاص والإعدادات بشكل دائم وفوري على Cloud Firestore مع عزل كامل للبيانات وأمان عالي.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono shrink-0">
                <div className="text-center">
                  <span className="block text-[10px] text-blue-200 font-sans">الفعاليات</span>
                  <span className="font-bold text-sm text-white">{(events || []).length}</span>
                </div>
                <div className="w-px h-6 bg-white/20"></div>
                <div className="text-center">
                  <span className="block text-[10px] text-blue-200 font-sans">المزامنة</span>
                  <span className="font-bold text-xs text-emerald-300">{isSyncing ? 'جاري الحفظ...' : 'مكتملة'}</span>
                </div>
              </div>
            </div>

            {/* Direct Unified Cloud Access Bar */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-200 font-medium">نمط المزامنة:</span>
                <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  وصول مباشر دائم وموحد لجميع أجهزتك (بدون تسجيل دخول)
                </span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => syncNow()}
                  disabled={isSyncing}
                  className="bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة وتحديث السحابة الآن'}</span>
                </button>
              </div>
            </div>
          </div>

          {backupMessage && (
            <div className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-bold ${
              backupMessage.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {backupMessage.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{backupMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Backup */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#1A1A1A] mb-1">
                  تصدير نسخة احتياطية كاملة (JSON)
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  احفظ نسخة كاملة آمنة من كافة الفعاليات، سجلات الحضور، قاعدة بيانات الأشخاص، وتفضيلات الإعدادات في ملف واحد على جهازك.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportBackup}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل ملف النسخة الاحتياطية</span>
              </button>
            </div>

            {/* Import Backup */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#1A1A1A] mb-1">
                  استعادة البيانات من نسخة سابقة
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  استرجع جميع الفعاليات والمشاركين والإعدادات من ملف JSON محفوظ مسبقاً على هذا الجهاز أو أي جهاز آخر.
                </p>
                <input
                  type="file"
                  ref={restoreFileInputRef}
                  onChange={handleRestoreBackup}
                  accept=".json"
                  className="hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => restoreFileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span>اختيار ملف النسخة الاحتياطية لاستعادته</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Reset & Clear */}
          <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-rose-900 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>منطقة العمليات الحساسة وإعادة الضبط</span>
              </h3>
              <p className="text-xs text-rose-700">
                إعادة ضبط النظام أو مسح البيانات المحفوظة محلياً في هذا المتصفح
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط الإعدادات الافتراضية</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>مسح كافة الفعاليات والمشاركين</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Clear */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200 text-right">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-[#1A1A1A]">هل أنت متأكد من مسح كافة البيانات؟</h3>
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              سيتم حذف جميع الفعاليات ({(events || []).length}) وسجلات الحضور نهائياً من المتصفح. لا يمكن التراجع عن هذه العملية إلا إذا كنت تحتفظ بنسخة احتياطية.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                نعم، مسح كل شيء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200 text-right">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-100">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-[#1A1A1A]">إعادة ضبط الإعدادات</h3>
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              سيتم إعادة ضبط مظهر وخيارات النظام إلى الإعدادات الافتراضية. هل ترغب في المتابعة؟
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                نعم، إعادة الضبط
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
