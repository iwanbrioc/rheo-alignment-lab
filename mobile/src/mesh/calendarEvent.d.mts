import type { Session } from './types';
export function calendarEvent(session: Session, day: string): { title: string; startDate: Date; endDate: Date; location: string; notes: string };
export function localDay(now?: Date): string;
