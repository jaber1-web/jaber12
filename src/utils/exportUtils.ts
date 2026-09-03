import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { EventItem, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from './storage';

export function getAttendanceStats(event?: EventItem | null) {
  if (!event || !Array.isArray(event.attendees)) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      pending: 0,
      presentPct: 0,
      absentPct: 0,
      pendingPct: 0,
    };
  }
  const attendees = event.attendees || [];
  const total = attendees.length;
  const present = attendees.filter(a => a?.status === 'present').length;
  const absent = attendees.filter(a => a?.status === 'absent').length;
  const pending = attendees.filter(a => a?.status === 'pending').length;
  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
  const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

  return {
    total,
    present,
    absent,
    pending,
    presentPct,
    absentPct,
    pendingPct,
  };
}

export function generateTextReport(event: EventItem, settings: AppSettings = DEFAULT_SETTINGS): string {
  const stats = getAttendanceStats(event);
  const now = new Date().toLocaleString('ar-SA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const attendees = event?.attendees || [];

  let text = `📋 *${settings.orgName || 'كشف حضور الفعالية'}*\n`;
  if (settings.orgSubtitle) {
    text += `🏢 ${settings.orgSubtitle}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📌 *الفعالية:* ${event?.title || ''}\n`;
  text += `📅 *التاريخ:* ${event?.date || ''}\n`;
  if (event?.location) {
    text += `📍 *الموقع:* ${event.location}\n`;
  }
  text += `\n📊 *الملخص:*\n`;
  text += `• الإجمالي: ${stats.total}\n`;
  text += `• الحاضرين: ${stats.present} (${stats.presentPct}%)\n`;
  text += `• الغائبين: ${stats.absent} (${stats.absentPct}%)\n`;
  if (stats.pending > 0) {
    text += `• معلق: ${stats.pending}\n`;
  }

  if (event?.rounds && event.rounds.length > 0) {
    text += `\n⏱️ *جولات التفقد الدوري (${event.rounds.length}):*\n`;
    event.rounds.forEach((r) => {
      const pCount = Object.values(r.records || {}).filter((s) => s === 'present').length;
      text += `• ${r.name}: ${pCount} حاضر\n`;
    });
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👥 *قائمة الحضور:*\n\n`;

  if (attendees.length === 0) {
    text += `(لا يوجد مسجلين حتى الآن)\n`;
  } else {
    attendees.forEach((a, idx) => {
      const statusIcon = a.status === 'present' ? '✅ حاضر' : a.status === 'absent' ? '❌ غائب' : '⏳ معلق';
      text += `${idx + 1}. *${a.name}* [${statusIcon}]\n`;
      if (a.phone) text += `   • الجوال: ${a.phone}\n`;
      if (settings.includeStcInPrint && a.stcNumber) {
        text += `   • رقم STC: ${a.stcNumber}\n`;
      }
      if (settings.includeEmailInPrint && a.email) {
        text += `   • الإيميل: ${a.email}\n`;
      }
      text += `\n`;
    });
  }

  text += `🕒 *تاريخ الاستخراج:* ${now}\n`;

  return text;
}

export function shareViaWhatsApp(event: EventItem, settings: AppSettings = DEFAULT_SETTINGS) {
  const text = generateTextReport(event, settings);
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    window.open(url, '_blank');
  }
}

export function shareViaEmail(event: EventItem, settings: AppSettings = DEFAULT_SETTINGS) {
  const subject = encodeURIComponent(`تقرير حضور: ${event.title} - ${event.date}`);
  const body = encodeURIComponent(generateTextReport(event, settings));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export async function copyReportToClipboard(event: EventItem, settings: AppSettings = DEFAULT_SETTINGS): Promise<boolean> {
  try {
    const text = generateTextReport(event, settings);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}

export function exportToExcel(event: EventItem, settings: AppSettings = DEFAULT_SETTINGS) {
  const stats = getAttendanceStats(event);
  const attendees = event?.attendees || [];

  const attendeeRows = attendees.map((a, idx) => {
    const row: Record<string, any> = {
      'م': idx + 1,
      'الاسم الكامل': a.name,
      'حالة الحضور': a.status === 'present' ? 'حاضر ✅' : a.status === 'absent' ? 'لم يحضر ❌' : 'لم يسجل بعد ⏳',
      'رقم الجوال': a.phone || '-',
    };

    if (settings.includeStcInPrint) {
      row['رقم جوال STC'] = a.stcNumber || '-';
    }
    if (settings.includeEmailInPrint) {
      row['البريد الإلكتروني'] = a.email || '-';
    }

    // Include all checkpoints / rounds if present
    if (event?.rounds && event.rounds.length > 0) {
      event.rounds.forEach((round) => {
        const rStatus = round.records ? round.records[a.personId] : undefined;
        row[round.name] = rStatus === 'present' ? 'حاضر ✅' : rStatus === 'absent' ? 'غائب ❌' : 'معلق ⏳';
      });

      const presentInRounds = event.rounds.filter(
        (r) => r.records && r.records[a.personId] === 'present'
      ).length;
      const rate = Math.round((presentInRounds / event.rounds.length) * 100);
      row['نسبة استمرار التواجد'] = `${rate}% (${presentInRounds}/${event.rounds.length})`;
    }

    row['وقت التسجيل'] = a.markedAt ? new Date(a.markedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

    return row;
  });

  const summaryRows = [
    { 'البيان': 'المنشأة / الجهة', 'القيمة': settings.orgName },
    { 'البيان': 'اسم الفعالية', 'القيمة': event?.title || '' },
    { 'البيان': 'تاريخ الفعالية', 'القيمة': event?.date || '' },
    { 'البيان': 'الموقع', 'القيمة': event?.location || 'غير محدد' },
    { 'البيان': 'إجمالي المسجلين', 'القيمة': stats.total },
    { 'البيان': 'عدد الحاضرين', 'القيمة': `${stats.present} (${stats.presentPct}%)` },
    { 'البيان': 'عدد الغائبين', 'القيمة': `${stats.absent} (${stats.absentPct}%)` },
    { 'البيان': 'لم يتم تحضيرهم', 'القيمة': `${stats.pending} (${stats.pendingPct}%)` },
    { 'البيان': 'المسؤول المعتمد', 'القيمة': settings.authorizedSigner || 'إدارة النظام' },
    { 'البيان': 'تاريخ استخراج التقرير', 'القيمة': new Date().toLocaleString('ar-SA') },
  ];

  const wb = XLSX.utils.book_new();

  const wsAttendees = XLSX.utils.json_to_sheet(attendeeRows);
  if (!wsAttendees['!views']) wsAttendees['!views'] = [];
  wsAttendees['!views'].push({ RTL: true });
  wsAttendees['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAttendees, 'قائمة الحضور');

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  if (!wsSummary['!views']) wsSummary['!views'] = [];
  wsSummary['!views'].push({ RTL: true });
  wsSummary['!cols'] = [
    { wch: 24 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص التقرير');

  const cleanTitle = (event?.title || 'فعالية').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 30);
  const filename = `تقرير_حضور_${cleanTitle}_${event?.date || 'تاريخ'}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export function getPresetSvg(preset: string, color = '#2563eb'): string {
  switch (preset) {
    case 'crown':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.269a4 4 0 0 1-3.86 2.934H8.713a4 4 0 0 1-3.86-2.934L2.019 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>`;
    case 'shield':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`;
    case 'award':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`;
    case 'star':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    case 'users':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    case 'flame':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>`;
    case 'sparkles':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    case 'building':
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`;
  }
}

export function generatePrintableHtml(event: EventItem, settings: AppSettings = DEFAULT_SETTINGS): string {
  const stats = getAttendanceStats(event);
  const now = new Date().toLocaleString('ar-SA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const attendees = event?.attendees || [];

  const logoHtml = settings.showLogoInReports
    ? settings.logoType === 'custom' && settings.customLogoUrl
      ? `<img src="${settings.customLogoUrl}" alt="Logo" class="logo-img" />`
      : `<div class="logo-preset">${getPresetSvg(settings.presetIcon, '#2563eb')}</div>`
    : '';

  const attendeesRows = attendees.map((a, idx) => {
    const statusClass = a.status === 'present' ? 'status-present' : a.status === 'absent' ? 'status-absent' : 'status-pending';
    const statusText = a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غائب' : 'معلق';
    const timeText = a.markedAt ? new Date(a.markedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

    return `
      <tr>
        <td class="col-num">${idx + 1}</td>
        <td class="col-name">${a.name}</td>
        <td class="col-status"><span class="badge ${statusClass}">${statusText}</span></td>
        <td class="col-phone" dir="ltr">${a.phone || '-'}</td>
        ${settings.includeStcInPrint ? `<td class="col-stc" dir="ltr">${a.stcNumber || '-'}</td>` : ''}
        ${settings.includeEmailInPrint ? `<td class="col-email" dir="ltr">${a.email || '-'}</td>` : ''}
        <td class="col-time">${timeText}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${settings.printHeaderTitle} - ${event.title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.4;
      padding: 12px;
    }

    /* Minimalist Modern Top Header */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 2px solid #2563eb;
      margin-bottom: 12px;
    }
    .org-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .org-brand h1 {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .org-brand p {
      font-size: 11px;
      color: #64748b;
    }
    .logo-img {
      max-height: 38px;
      max-width: 100px;
      object-fit: contain;
    }
    .logo-preset {
      width: 36px;
      height: 36px;
      background-color: #eff6ff;
      border-radius: 8px;
      border: 1px solid #dbeafe;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .report-date {
      text-align: left;
      font-size: 10px;
      color: #64748b;
    }
    .report-date strong {
      font-size: 12px;
      color: #1e293b;
      display: block;
    }

    /* Compact Event Summary Bar */
    .event-info-bar {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .event-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .event-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #475569;
    }
    .event-meta span strong {
      color: #0f172a;
    }

    /* Lightweight Stats Bar */
    .stats-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat-pill {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
      background-color: #ffffff;
    }
    .stat-pill.present {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }
    .stat-pill.absent {
      background-color: #fef2f2;
      border-color: #fecaca;
    }
    .stat-pill.rate {
      background-color: #eff6ff;
      border-color: #bfdbfe;
    }
    .stat-pill .label {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 1px;
    }
    .stat-pill .value {
      font-size: 14px;
      font-weight: 800;
      font-family: monospace, sans-serif;
    }
    .stat-pill.present .value { color: #166534; }
    .stat-pill.absent .value { color: #991b1b; }
    .stat-pill.rate .value { color: #1d4ed8; }

    /* Clean Minimalist Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 11px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: right;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 10.5px;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .col-num { width: 28px; text-align: center; font-family: monospace; color: #94a3b8; font-size: 10px; }
    .col-name { min-width: 150px; font-weight: 600; color: #0f172a; }
    .col-status { width: 75px; text-align: center; }
    .col-phone, .col-stc { width: 105px; font-family: monospace; text-align: left; font-size: 11px; }
    .col-email { width: 140px; font-family: monospace; text-align: left; font-size: 10px; }
    .col-time { width: 65px; text-align: center; font-size: 10px; color: #64748b; font-family: monospace; }

    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-align: center;
    }
    .status-present { background-color: #dcfce7; color: #166534; }
    .status-absent { background-color: #fee2e2; color: #991b1b; }
    .status-pending { background-color: #fef3c7; color: #92400e; }

    /* Minimalist Clean Footer */
    .minimal-footer {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #94a3b8;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="org-brand">
      ${logoHtml}
      <div>
        <h1>${settings.orgName || 'كشف حضور الفعالية'}</h1>
        ${settings.orgSubtitle ? `<p>${settings.orgSubtitle}</p>` : ''}
      </div>
    </div>
    <div class="report-date">
      <strong>${settings.printHeaderTitle}</strong>
      <span>${now}</span>
    </div>
  </div>

  <div class="event-info-bar">
    <div class="event-title">${event.title}</div>
    <div class="event-meta">
      <span>التاريخ: <strong>${event.date}</strong></span>
      ${event.location ? `<span>الموقع: <strong>${event.location}</strong></span>` : ''}
    </div>
  </div>

  ${settings.includeStatsInPrint ? `
  <div class="stats-row">
    <div class="stat-pill">
      <div class="label">إجمالي المسجلين</div>
      <div class="value">${stats.total}</div>
    </div>
    <div class="stat-pill present">
      <div class="label">الحاضرين</div>
      <div class="value">${stats.present} (${stats.presentPct}%)</div>
    </div>
    <div class="stat-pill absent">
      <div class="label">الغائبين</div>
      <div class="value">${stats.absent} (${stats.absentPct}%)</div>
    </div>
    <div class="stat-pill rate">
      <div class="label">نسبة الحضور</div>
      <div class="value">${stats.presentPct}%</div>
    </div>
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>الاسم</th>
        <th>الحالة</th>
        <th>رقم الجوال</th>
        ${settings.includeStcInPrint ? `<th>رقم STC</th>` : ''}
        ${settings.includeEmailInPrint ? `<th>البريد الإلكتروني</th>` : ''}
        <th>الوقت</th>
      </tr>
    </thead>
    <tbody>
      ${attendeesRows || '<tr><td colspan="7" style="text-align:center; padding: 15px; color: #94a3b8;">لا يوجد مشاركين مسجلين في هذا الكشف</td></tr>'}
    </tbody>
  </table>

  <div class="minimal-footer">
    <span>${settings.orgName}</span>
    <span>تاريخ الاستخراج: ${now}</span>
  </div>
</body>
</html>
  `;
}

/**
 * Direct export of an event attendance report to a PDF file.
 * Uses an isolated sandbox iframe free from Tailwind CSS oklch colors.
 */
export async function exportEventToPdf(
  event: EventItem,
  settings: AppSettings = DEFAULT_SETTINGS
): Promise<boolean> {
  const cleanTitle = event.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 30);
  const filename = `تقرير_حضور_${cleanTitle}_${event.date}.pdf`;

  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '794px';
      iframe.style.height = '1123px';
      iframe.style.border = '0';
      iframe.style.backgroundColor = '#ffffff';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve(false);
        return;
      }

      frameDoc.open();
      frameDoc.write(generatePrintableHtml(event, settings));
      frameDoc.close();

      setTimeout(async () => {
        try {
          const targetBody = frameDoc.body;
          const canvas = await html2canvas(targetBody, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 794,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210;
          const pageHeight = 297;
          const margin = 8;
          const printableWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * printableWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = margin;

          pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight, undefined, 'FAST');
          heightLeft -= (pageHeight - margin * 2);

          while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pageHeight - margin * 2);
          }

          pdf.save(filename);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          resolve(true);
        } catch (error) {
          console.error('Error generating PDF download:', error);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          resolve(false);
        }
      }, 350);
    } catch (err) {
      console.error('Failed to prepare PDF iframe:', err);
      resolve(false);
    }
  });
}

/**
 * Universal Print & PDF trigger:
 * 1. Prepares clean isolated HTML.
 * 2. Attempts window.print() on the isolated frame.
 * 3. If printing is constrained by sandbox environment, falls back to direct PDF download automatically.
 */
export async function printOrSavePdf(
  event: EventItem,
  settings: AppSettings = DEFAULT_SETTINGS
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generatePrintableHtml(event, settings);
      const iframeId = 'attendance-print-frame';
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (iframe) {
        iframe.remove();
      }

      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (frameDoc && iframe.contentWindow) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();

        let completed = false;

        const attemptPrint = () => {
          if (completed) return;
          try {
            iframe?.contentWindow?.focus();
            iframe?.contentWindow?.print();
            completed = true;
            resolve(true);
          } catch (e) {
            console.warn('Iframe print failed or blocked, falling back to PDF file export:', e);
            completed = true;
            exportEventToPdf(event, settings).then(resolve);
          }
        };

        iframe.onload = () => {
          setTimeout(attemptPrint, 300);
        };

        setTimeout(attemptPrint, 600);
      } else {
        exportEventToPdf(event, settings).then(resolve);
      }
    } catch (err) {
      console.error('Print generation error:', err);
      exportEventToPdf(event, settings).then(resolve);
    }
  });
}
