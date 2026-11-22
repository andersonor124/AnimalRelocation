// Builds an .ics calendar file so owners can add every deadline to their calendar.
import type { Plan } from '../../shared/types.ts';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const d = (iso: string) => iso.replaceAll('-', '');

/** Fold long lines to 75 octets as the iCalendar spec requires. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function planToICS(plan: Plan, petName = 'your pet', idPrefix = 'petpassage'): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PetPassage//Pet relocation planner//EN', 'CALSCALE:GREGORIAN'];
  for (const t of plan.tasks) {
    if (t.done) continue;
    const end = new Date(Date.parse(t.dueDate) + 86_400_000).toISOString().slice(0, 10);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${idPrefix}-${t.id}@petpassage`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d(t.dueDate)}`,
      `DTEND;VALUE=DATE:${d(end)}`,
      `SUMMARY:${esc(`🐾 ${t.title} (${petName})`)}`,
      `DESCRIPTION:${esc(`${t.what}\n\nHow: ${t.how}\n\nRecommended start: ${t.startBy}${t.officialUrl ? `\nOfficial info: ${t.officialUrl}` : ''}`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(t.title)}`,
      'TRIGGER:-P3D',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
