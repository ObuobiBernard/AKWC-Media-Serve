/**
 * WhatsApp Notification Generator for AKWC Media Ministry
 */

export function formatPhoneForWhatsApp(rawPhone: string): string {
  // Strip non-digit characters
  const digits = rawPhone.replace(/\D/g, '');

  // If starts with 0 (e.g. 0543515464), replace with Ghana country code 233
  if (digits.startsWith('0') && digits.length === 10) {
    return '233' + digits.substring(1);
  }

  // If already starts with 233
  if (digits.startsWith('233')) {
    return digits;
  }

  return digits;
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
}

export function buildAssignmentWhatsAppMessage(params: WhatsAppAssignmentNotificationParams): {
  phone: string;
  message: string;
  whatsappUrl: string;
} {
  const formattedPhone = formatPhoneForWhatsApp(params.memberPhone);
  const baseUrl = params.appUrl || window.location.origin;

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

Please open MediaServe below to *Confirm* or manage your attendance:
👉 ${baseUrl}

_"Whatever you do, work at it with all your heart, as working for the Lord." — Colossians 3:23_
God bless you for your dedicated service!
— *AKWC Media Production Leadership*`;

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  return {
    phone: formattedPhone,
    message,
    whatsappUrl,
  };
}

export function openWhatsAppNotification(whatsappUrl: string) {
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
}
