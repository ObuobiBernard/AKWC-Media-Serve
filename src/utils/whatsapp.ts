/**
 * WhatsApp Notification Generator for AKWC Media Ministry
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

export const SHARED_PRODUCTION_URL = 'https://ais-pre-z3xlqsfzebdajhhhc4glht-564557384915.europe-west3.run.app';

export function getLiveAppBaseUrl(overrideUrl?: string): string {
  let url = SHARED_PRODUCTION_URL;

  if (overrideUrl && !overrideUrl.includes('github.io') && !overrideUrl.includes('localhost')) {
    url = overrideUrl;
  } else if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (!origin.includes('ais-dev') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      url = origin;
    }
  }

  // Remove trailing slash to prevent double slashes in generated query URLs
  return url.replace(/\/+$/, '');
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
  const confirmUrl =
    params.assignmentId && params.memberId
      ? `${baseUrl}/?action=confirm&asgId=${params.assignmentId}&memberId=${params.memberId}`
      : baseUrl;

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

Tap the direct link below to *Confirm your attendance* on your member portal:
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
  const confirmUrl = `${baseUrl}/?action=confirm&asgId=${params.assignmentId}&memberId=${params.memberId}`;

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
  tempPassword?: string;
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
*MEDIA MINISTRY ACCOUNT CREATED* 🎉📱

Shalom *${params.memberName}*,
Welcome to the AKWC Media Team! An account has been created for you on the MediaServe platform.

🔑 *Your Login Credentials:*
🌐 *Portal URL:* ${baseUrl}
📧 *Email:* ${params.email}
🔒 *Temporary Password:* *${params.tempPassword || 'Password123!'}*

Please log in to view upcoming rosters, set your availability, and confirm duty assignments. Once logged in, you can update your password in settings.

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
