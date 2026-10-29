import { google } from 'googleapis';

export interface CalendarEventResult {
  success: boolean;
  configured: boolean;
  eventId?: string;
  meetUrl?: string;
  eventLink?: string;
  error?: string;
  response?: any;
}

export function parseDateTimeToISO(dateStr: string, timeSlotStr: string): { startISO: string; endISO: string } {
  // Example: dateStr = "2026-11-05", timeSlotStr = "11:15 AM IST"
  let hour = 11;
  let minute = 0;

  const match = timeSlotStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    hour = parseInt(match[1]);
    minute = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const startISO = `${dateStr}T${pad(hour)}:${pad(minute)}:00+05:30`;

  // 30 minute duration
  let endHour = hour;
  let endMinute = minute + 30;
  if (endMinute >= 60) {
    endHour += 1;
    endMinute -= 60;
  }
  const endISO = `${dateStr}T${pad(endHour)}:${pad(endMinute)}:00+05:30`;

  return { startISO, endISO };
}

export function isGoogleCalendarConfigured(): boolean {
  const directToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

  if (directToken && directToken.trim() !== '') return true;
  if (
    serviceAccountEmail &&
    privateKey &&
    !serviceAccountEmail.includes('your-gcp-project') &&
    !privateKey.includes('YourPrivateKey')
  ) {
    return true;
  }
  return false;
}

export async function createGoogleCalendarAppointment({
  appointmentId,
  docketNumber,
  customerName,
  customerEmail,
  customerPhone,
  date,
  timeSlot,
  insuranceConcern,
  insuranceCompany,
  customMeetUrl
}: {
  appointmentId: string;
  docketNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  timeSlot: string;
  insuranceConcern: string;
  insuranceCompany?: string;
  customMeetUrl?: string;
}): Promise<CalendarEventResult> {
  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Google Calendar API not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in environment variables.'
    };
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const directToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
  let calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  try {
    let auth: any;

    if (directToken) {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: directToken });
      auth = oauth2Client;
    } else if (serviceAccountEmail && privateKey) {
      // Format private key newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      auth = new google.auth.JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
      });
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const { startISO, endISO } = parseDateTimeToISO(date, timeSlot);

    // Verify calendar exists; fallback to primary if configured ID is not accessible
    try {
      await calendar.calendars.get({ calendarId });
    } catch (calCheckErr: any) {
      if (calCheckErr.code === 404 && calendarId !== 'primary') {
        console.warn(`[Calendar] Calendar ID '${calendarId}' returned 404. Falling back to service account primary calendar.`);
        calendarId = 'primary';
      }
    }

    const eventResource: any = {
      summary: `Bima Dost Insurance Consultation: ${customerName} (#${docketNumber})`,
      description: `Official Bima Dost Civic Insurance Grievance Session
Docket Reference: #${docketNumber}
Customer: ${customerName}
Phone: ${customerPhone}
Email: ${customerEmail}
Insurance Company: ${insuranceCompany || 'General Insurer'}
Concern: ${insuranceConcern}

Statutory Rule: Insurance Ombudsman Regulations 2017 & Section 45 Insurance Act.`,
      start: {
        dateTime: startISO,
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: endISO,
        timeZone: 'Asia/Kolkata'
      },
      attendees: [
        { email: customerEmail, displayName: customerName }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    // First attempt: with Google Meet conferenceData
    let eventData: any;
    let meetUrl: string | undefined = customMeetUrl?.trim();

    try {
      const res = await calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: {
          ...eventResource,
          conferenceData: {
            createRequest: {
              requestId: `bmd_${appointmentId.replace(/[^a-zA-Z0-9]/g, '')}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        }
      });
      eventData = res.data;
      const confUri = eventData.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri;
      if (confUri || eventData.hangoutLink) {
        meetUrl = confUri || eventData.hangoutLink;
      }
    } catch (confErr: any) {
      // If conference generation is restricted on the service account, insert event without conferenceData
      console.warn(`[Calendar] Conference creation note: ${confErr.message}. Creating calendar event.`);
      try {
        const res = await calendar.events.insert({
          calendarId,
          requestBody: eventResource
        });
        eventData = res.data;
      } catch (attErr: any) {
        if (attErr.message?.includes('attendees') || attErr.code === 403) {
          console.warn('[Calendar] Retrying without attendees list for service account compatibility.');
          const { attendees, ...resourceWithoutAttendees } = eventResource as any;
          const res = await calendar.events.insert({
            calendarId,
            requestBody: resourceWithoutAttendees
          });
          eventData = res.data;
        } else {
          throw attErr;
        }
      }
    }

    // If meetUrl was not provided by Google Calendar, check if user provided customMeetUrl or standard appointment Meet link
    if (!meetUrl) {
      meetUrl = customMeetUrl || `https://meet.google.com/bmd-${docketNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }

    return {
      success: true,
      configured: true,
      eventId: eventData.id || undefined,
      eventLink: eventData.htmlLink || undefined,
      meetUrl,
      response: eventData
    };
  } catch (err: any) {
    console.error('[Calendar] Error creating Google Calendar event:', err);
    return {
      success: false,
      configured: true,
      error: err.message || 'Error creating Google Calendar appointment'
    };
  }
}
