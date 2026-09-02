export type WhatsAppTemplateType = 'reminder' | 'thank_you' | 'absent_inquiry' | 'custom';

export interface WhatsAppTemplateConfig {
  type: WhatsAppTemplateType;
  label: string;
  badge: string;
  iconName: string;
  description: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplateConfig[] = [
  {
    type: 'reminder',
    label: 'تذكير بالفعالية',
    badge: 'قبل الموعد',
    iconName: 'Bell',
    description: 'تذكير المشارك بموعد وموقع الفعالية ودعوته للحضور',
  },
  {
    type: 'thank_you',
    label: 'شكر على الحضور',
    badge: 'للحاضرين ✅',
    iconName: 'HeartHandshake',
    description: 'رسالة شكر وتقدير للمشارك على حضوره وتفاعله في الفعالية',
  },
  {
    type: 'absent_inquiry',
    label: 'تنبيه واستفسار عن الغياب',
    badge: 'للغائبين ❌',
    iconName: 'HelpCircle',
    description: 'رسالة لطيفة للاطمئنان على الغائب والاعتذار عن تفويته للحدث',
  },
  {
    type: 'custom',
    label: 'رسالة مخصصة',
    badge: 'كتابة حرة',
    iconName: 'PenTool',
    description: 'كتابة رسالة خاصة ومباشرة للمشارك',
  },
];

/**
 * Normalizes phone numbers for WhatsApp URL (defaults to Saudi Arabia 966 if 05XXXXXXXX)
 */
export function formatPhoneForWhatsApp(rawPhone: string): string {
  if (!rawPhone) return '';
  
  // Remove all non-numeric characters except +
  let cleaned = rawPhone.replace(/[^\d+]/g, '');

  // If starts with +, remove +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 00, remove 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Saudi local number format: 05XXXXXXXX (10 digits) -> 9665XXXXXXXX
  if (/^05\d{8}$/.test(cleaned)) {
    return '966' + cleaned.substring(1);
  }

  // 9 digits starting with 5 (e.g. 5XXXXXXXX) -> 9665XXXXXXXX
  if (/^5\d{8}$/.test(cleaned)) {
    return '966' + cleaned;
  }

  return cleaned;
}

export interface BuildMessageParams {
  type: WhatsAppTemplateType;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation?: string;
  orgName?: string;
  customText?: string;
}

export function buildWhatsAppMessage(params: BuildMessageParams): string {
  const { type, attendeeName, eventTitle, eventDate, eventLocation, orgName, customText } = params;
  const name = attendeeName.trim();
  const org = orgName?.trim() ? `\n*${orgName.trim()}*` : '';
  const loc = eventLocation?.trim() ? `\n📍 *الموقع:* ${eventLocation.trim()}` : '';

  switch (type) {
    case 'reminder':
      return `السلام عليكم ورحمة الله وبركاته 🌸

مرحباً أخي/أختي *${name}*،
نود تذكيركم بموعد فعاليتنا القادمة:
📌 *${eventTitle}*
📅 *التاريخ:* ${eventDate}${loc}

يسعدنا ويشرفنا حضوركم ومشاركتكم الكريمة! نتطلع لرؤيتكم بإذن الله ✨${org}`;

    case 'thank_you':
      return `السلام عليكم ورحمة الله وبركاته 🌸

الأخ/الأخت العزيز/ة *${name}*،
شكر وتقدير من أعماق القلب لحضوركم وتواجدكم المشرّف في فعاليتنا:
📌 *${eventTitle}*
📅 *التاريخ:* ${eventDate}

لقد كان لمشاركتكم الفعالة أطيب الأثر في نجاح الفعالية، ونسعد دوماً بلقائكم في مناسباتنا القادمة بإذن الله 💐${org}`;

    case 'absent_inquiry':
      return `السلام عليكم ورحمة الله وبركاته 🌸

الأخ/الأخت *${name}*،
افتقدنا تواجدكم الكريم ومشاركتكم في فعاليتنا اليوم:
📌 *${eventTitle}*
📅 *التاريخ:* ${eventDate}

نأمل أن يكون المانع خيراً وأن تكونوا بأتم الصحة والعافية. نتمنى لقاءكم بإذن الله في مناسباتنا القادمة! 🌿${org}`;

    case 'custom':
    default:
      return customText || `السلام عليكم ورحمة الله وبركاته أخي *${name}*،\nبخصوص فعالية *${eventTitle}*...`;
  }
}

export function openWhatsAppChat(phone: string, message: string): boolean {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  if (!cleanPhone) return false;
  const encodedText = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
