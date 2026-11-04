// Logged-in profile + that profile's upcoming reminders (for Home).
//
// - Logged-in profile: the one picked on Choose Profile (MockAuth, Profile team).
// - Reminders: the SAME list the Reminders tab shows (Reminders team saves it on the phone
//   under 'mediscan.reminders.v1'). Home only READS it, so the two screens always match.
//   A reminder belongs to a profile when reminder.member === profile.profile_display_name
//   (e.g. "Me", "Mama"), which is how the Reminders tab's member filter works too.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SAMPLE_REMINDERS, type Reminder } from '@/components/reminderTypes';
import { MockAuth, type Profile } from '@/mock/mockAuth';

// Same key as src/app/(tabs)/reminders.tsx (keep them in sync).
export const REMINDERS_STORAGE_KEY = 'mediscan.reminders.v1';

export function useLoggedInProfile(): Profile | null {
  return MockAuth.getActiveProfile();
}

// "Jane Doe" -> "Jane"
export function firstName(p: Pick<Profile, 'profile_fullname' | 'profile_display_name'> | null): string {
  const name = p?.profile_fullname?.trim() || p?.profile_display_name?.trim() || '';
  return name.split(/\s+/)[0] || 'there';
}

// Reads the reminders again every time Home comes into view, so edits made on the
// Reminders tab show up right away.
export function useSavedReminders(): Reminder[] {
  const [reminders, setReminders] = useState<Reminder[]>(SAMPLE_REMINDERS);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem(REMINDERS_STORAGE_KEY)
        .then((saved) => {
          if (!alive || !saved) return;
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) setReminders(parsed as Reminder[]);
        })
        .catch((e) => console.log('[home] could not read reminders', e));
      return () => {
        alive = false;
      };
    }, []),
  );
  return reminders;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// "Aug 13, 2026" -> Date (local midnight), null if it can't be read
export function parseStartDate(text: string | undefined): Date | null {
  const m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec((text ?? '').trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return null;
  return new Date(Number(m[3]), month, Number(m[2]));
}

// "6:00 AM" -> { h: 6, m: 0 }, null if it can't be read
export function parseTime(text: string | undefined): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec((text ?? '').trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return { h, m: Number(m[2]) };
}

export type UpcomingReminder = {
  reminder: Reminder;
  next: Date | null; // next time it rings (null = "As needed" or no time)
  label: string;     // "Today, 8:00 PM" / "Tomorrow, 6:00 AM" / "Aug 20, 6:00 AM" / "As needed"
};

// Next ring time. Daily: today or tomorrow. Weekly: same weekday as the start date.
export function nextOccurrence(r: Reminder, now = new Date()): Date | null {
  if (r.frequency === 'As needed') return null;
  const t = parseTime(r.time);
  if (!t) return null;
  const start = parseStartDate(r.startDate);
  const step = r.frequency === 'Weekly' ? 7 : 1;

  // first candidate day = start date (if in the future) or today
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  if (start && start > day) day.setTime(start.getTime());
  if (step === 7 && start) {
    while (day.getDay() !== start.getDay()) day.setDate(day.getDate() + 1);
  }
  for (let i = 0; i < 3; i++) {
    const at = new Date(day);
    at.setHours(t.h, t.m, 0, 0);
    if (at > now) return at;
    day.setDate(day.getDate() + step);
  }
  return null;
}

function label(r: Reminder, next: Date | null, now = new Date()): string {
  if (!next) return r.frequency === 'As needed' ? 'As needed' : r.time || '—';
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = new Date(next);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return `Today, ${r.time}`;
  if (diff === 1) return `Tomorrow, ${r.time}`;
  return `${MONTHS[d.getMonth()][0].toUpperCase()}${MONTHS[d.getMonth()].slice(1)} ${d.getDate()}, ${r.time}`;
}

// Turned-on reminders of one profile, soonest first ("As needed" ones last).
export function getUpcomingReminders(
  reminders: Reminder[],
  profile: Pick<Profile, 'profile_display_name'> | null,
  now = new Date(),
): UpcomingReminder[] {
  if (!profile) return [];
  const member = profile.profile_display_name.trim().toLowerCase();
  return reminders
    .filter((r) => r.enabled && (r.member ?? '').trim().toLowerCase() === member)
    .map((r) => {
      const next = nextOccurrence(r, now);
      return { reminder: r, next, label: label(r, next, now) };
    })
    .sort((a, b) => (a.next?.getTime() ?? Infinity) - (b.next?.getTime() ?? Infinity));
}
