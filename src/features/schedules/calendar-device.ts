import * as Calendar from 'expo-calendar';
import { calendarFetchRange, type CalendarEventForImport } from './calendar-import';

export interface EventCalendarOption {
    id: string;
    title: string;
}

export async function requestEventCalendars(): Promise<{
    canAskAgain: boolean;
    granted: boolean;
    calendars: EventCalendarOption[];
}> {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) {
        return {
            canAskAgain: permission.canAskAgain,
            granted: false,
            calendars: [],
        };
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return {
        canAskAgain: permission.canAskAgain,
        granted: true,
        calendars: calendars
            .filter((calendar) => calendar.isVisible !== false)
            .map(({ id, title }) => ({ id, title }))
            .sort((left, right) => left.title.localeCompare(right.title)),
    };
}

export async function readCalendarEvents(
    calendarId: string,
    yearMonth: string,
): Promise<CalendarEventForImport[]> {
    const { startDate, endDate } = calendarFetchRange(yearMonth);
    const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);

    return events.map(({ title, startDate: eventStartDate }) => ({
        title,
        startDate: eventStartDate,
    }));
}
