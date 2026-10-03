import React from 'react';
import { ProgramService, RoleAssignment, MediaRole } from '../../types';
import { X, Calendar, Download, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CalendarSyncModalProps {
  program: ProgramService;
  isOpen: boolean;
  onClose: () => void;
  assignment?: RoleAssignment;
  role?: MediaRole;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  program,
  isOpen,
  onClose,
  assignment,
  role,
}) => {
  const { showToast } = useApp();

  if (!isOpen) return null;

  // Format date and time for Google Calendar: YYYYMMDDTHHmmSSZ
  // Example program date: '2026-10-04'
  const dateFormatted = program.date.replace(/-/g, '');
  const startHour = '070000'; // Default ISO format start
  const endHour = '120000';

  const title = role
    ? `[AKWC Media] ${role.name} - ${program.title}`
    : `[AKWC Media] ${program.title}`;

  const details = `COP Akweteyman Worship Center (AKWC) Media Duty
Service: ${program.title}
Date: ${program.date}
Service Time: ${program.startTime} - ${program.endTime}
Call Time (Strict): ${program.callTime}
${role ? `Assigned Role: ${role.name}\nStation: ${role.station}\n` : ''}
Location: ${program.location}
Director: ${program.directorName}

Please arrive in media dress code 15 minutes before your call time for sound checks and prayer.`;

  const encodedTitle = encodeURIComponent(title);
  const encodedDetails = encodeURIComponent(details);
  const encodedLocation = encodeURIComponent(program.location);

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${dateFormatted}T${startHour}/${dateFormatted}T${endHour}&details=${encodedDetails}&location=${encodedLocation}`;

  const handleDownloadIcs = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//COP Akweteyman Worship Center//MediaServe//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${program.id}-${Date.now()}@mediaserve.akwc.org
DTSTAMP:${dateFormatted}T000000Z
DTSTART:${dateFormatted}T${startHour}
DTEND:${dateFormatted}T${endHour}
SUMMARY:${title}
DESCRIPTION:${details.replace(/\n/g, '\\n')}
LOCATION:${program.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${program.id}-duty.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Calendar .ics file downloaded!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Add to Personal Calendar</h3>
              <p className="text-xs text-slate-400">Google Calendar & iCal Sync for AKWC Duty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs text-amber-400 font-medium">Event Summary</div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-slate-300">
              {program.date} · Call Time: <span className="font-semibold text-amber-300">{program.callTime}</span>
            </div>
            <div className="text-xs text-slate-400">{program.location}</div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Syncing this service ensures automatic native push notifications on your phone, preventing forgotten call times and schedule clashes.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            onClick={handleDownloadIcs}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Apple / Outlook (.ics)</span>
          </button>
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in Google Calendar</span>
          </a>
        </div>
      </div>
    </div>
  );
};
