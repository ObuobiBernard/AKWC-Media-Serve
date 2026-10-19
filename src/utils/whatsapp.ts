/**
 * WhatsApp Notification & Dispatch Generator for AKWC Media Ministry
 * COP Akweteyman Worship Center
 */

export function formatPhoneForWhatsApp(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 10) {
    return '233' + digits.substring(1);
  }

  if (digits.startsWith('233')) {
    return digits;
  }

  return digits;
}

/**
 * Dynamically resolves the live application URL so that links shared to WhatsApp
 * work seamlessly across any host (GitHub Pages, custom domain, Vercel, or local preview).
 */
export function getLiveAppBaseUrl(overrideUrl?: string): string {
  if (overrideUrl && overrideUrl.trim()) {
    return overrideUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    // Strip trailing slash and index.html if present
    let path = window.location.pathname || '';
    path = path.replace(/\/index\.html$/i, '').replace(/\/$/, '');
    return `${origin}${path}`.replace(/\/+$/, '');
  }

  return 'https://akwc-mediaserve.web.app';
}

export interface WhatsAppAssignmentNotificationParams {
  memberName: string;
  memberPhone: string;
  roleName: string;
  station: string;
  programTitle: string;
  programDate: string;
  callTime: string;
  startTime: string;
  endTime: string;
  appUrl?: string;
  assignmentId?: string;
  memberId?: string;
}

export function buildAssignmentWhatsAppMessage(params: WhatsAppAssignmentNotificationParams): {
  phone: string;
  message: string;
  whatsappUrl: string;
  confirmUrl: string;
} {
  const formattedPhone = formatPhoneForWhatsApp(params.memberPhone);
  const baseUrl = getLiveAppBaseUrl(params.appUrl);

  // Embed full fallback parameters so that opening on a mobile device without local storage cache still works instantly
  const queryParams = new URLSearchParams();
  queryParams.set('action', 'confirm');
  if (params.assignmentId) queryParams.set('asgId', params.assignmentId);
  if (params.memberId) queryParams.set('memberId', params.memberId);
  if (params.programTitle) queryParams.set('prog', params.programTitle);
  if (params.roleName) queryParams.set('role', params.roleName);
  if (params.programDate) queryParams.set('date', params.programDate);
  if (params.callTime) queryParams.set('call', params.callTime);
  if (params.station) queryParams.set('station', params.station);

  const confirmUrl = `${baseUrl}/?${queryParams.toString()}`;

  const message = 
`*COP AKWETEYMAN WORSHIP CENTER (AKWC)*
*MEDIA MINISTRY DUTY ASSIGNMENT*

Shalom *${params.memberName}*,
You have been scheduled on the AKWC Media Roster:

📌 *Assigned Role:* ${params.roleName}
⛪ *Service:* ${params.programTitle}
📅 *Date:* ${params.programDate}
⏰ *Call Time:* ${params.callTime} *(Service: ${params.startTime} - ${params.endTime})*
📍 *Station:* ${params.station}

Tap the direct link below to *Confirm your attendance* with 1 tap:
👉 ${confirmUrl}

_"Whatever you do, work at it with all your heart, as working for the Lord." — Colossians 3:23_
God bless you for your dedicated service!
— *AKWC Media Production Leadership*`;

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  return { phone: formattedPhone, message, whatsappUrl, confirmUrl };
}

export interface WhatsApp24HourReminderParams {
  memberName: string;
  memberPhone: string;
  roleName: string;
  station: string;
  programTitle: string;
  programDate: string;
  callTime: string;
  startTime: string;
  endTime: string;
  assignmentId: string;
  memberId: string;
  hoursRemaining?: number;
  appUrl?: string;
}

export function build24HourReminderWhatsAppMessage(params: WhatsApp24HourReminderParams): {
  phone: string;
  message: string;
  whatsappUrl: string;
  confirmUrl: string;
} {
  const formattedPhone = formatPhoneForWhatsApp(params.memberPhone);
  const baseUrl = getLiveAppBaseUrl(params.appUrl);

  const queryParams = new URLSearchParams();
  queryParams.set('action', 'confirm');
  queryParams.set('asgId', params.assignmentId);
  queryParams.set('memberId', params.memberId);
  if (params.programTitle) queryParams.set('prog', params.programTitle);
  if (params.roleName) queryParams.set('role', params.roleName);
  if (params.programDate) queryParams.set('date', params.programDate);
  if (params.callTime) queryParams.set('call', params.callTime);

  const confirmUrl = `${baseUrl}/?${queryParams.toString()}`;

  const message = 
`*COP AKWETEYMAN WORSHIP CENTER (AKWC)*
*URGENT: 24-HOUR MEDIA DUTY REMINDER* ⏳🎙️

Shalom *${params.memberName}*,
Your assigned media ministry duty is coming up within the next *24 hours* and your confirmation is still *PENDING*:

📌 *Assigned Role:* ${params.roleName}
⛪ *Service:* ${params.programTitle}
📅 *Date:* ${params.programDate}
⏰ *Call Time:* *${params.callTime}* (Service: ${params.startTime} - ${params.endTime})
📍 *Station:* ${params.station}

Tap your personal link below to *Confirm your arrival*:
👉 ${confirmUrl}

_Kindly respond promptly so the production director can finalize station coverage._
God bless your heart of service!
— *AKWC Media Production Leadership*`;

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  return { phone: formattedPhone, message, whatsappUrl, confirmUrl };
}

export interface WhatsAppNewMemberAccountParams {
  memberName: string;
  memberPhone: string;
  email: string;
  appUrl?: string;
}

export function buildNewMemberWhatsAppMessage(params: WhatsAppNewMemberAccountParams): {
  phone: string;
  message: string;
  whatsappUrl: string;
} {
  const formattedPhone = formatPhoneForWhatsApp(params.memberPhone);
  const baseUrl = getLiveAppBaseUrl(params.appUrl);

  const message = 
`*COP AKWETEYMAN WORSHIP CENTER (AKWC)*
*MEDIA MINISTRY ACCOUNT ACTIVATION* 🎉📱

Shalom *${params.memberName}*,
Welcome to the AKWC Media Team! An account has been created for you on the MediaServe platform.

🔑 *Your Access Details:*
🌐 *Portal URL:* ${baseUrl}
📧 *Registered Email:* ${params.email}

🔒 *First-Time Activation:* Simply enter your registered email address on the portal and create your personal password. No default passwords are used for maximum security.

You will be able to view upcoming rosters, set your availability, and confirm duty assignments.

_"Serve the Lord with gladness!" — Psalm 100:2_
— *AKWC Media Production Leadership*`;

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  return { phone: formattedPhone, message, whatsappUrl };
}

export function openWhatsAppNotification(whatsappUrl: string) {
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
}
