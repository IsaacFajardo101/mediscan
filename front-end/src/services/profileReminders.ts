// Current profile + that profile's upcoming reminders (for Home).
//
// TEMP: the Profile team owns "which profile is selected". Until their code is merged,
// this reads the profile id from AsyncStorage key 'mediscan.currentProfileId'
// (if they save the selected profile there, Home will follow it automatically),
// otherwise it uses the first profile in the shared mock.
// Reminders belong to the Reminders team; this only READS the shared reminder mock.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { getMockProfiles, getMockReminders } from '@/mock';
import type { Profile, ReminderSchedule, VaultMedicine } from '@/types/medicine';
import { formatTime, parseDate } from '@/utils/medicine';

export const CURRENT_PROFILE_KEY = 'mediscan.currentProfileId';

export function useCurrentProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const profiles = getMockProfiles();
      let id: string | null = null;
      try {
        id = await AsyncStorage.getItem(CURRENT_PROFILE_KEY);
      } catch {
        id = null;
      }
      const found = profiles.find((p) => String(p.profile_id) === id) ?? profiles[0] ?? null;
      if (alive) setProfile(found);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return profile;
}

// "Maria Batumbakal" -> "Maria"
export function firstName(p: Profile | null): string {
  const name = p?.profile_fullname?.trim() ?? '';
  return name.split(/\s+/)[0] || 'there';
}

export type UpcomingReminder = {
  schedule: ReminderSchedule;
  medicine: VaultMedicine | null;
  next: Date | null;   // next time it will ring (null = "as needed" / no time)
  label: string;       // "Today, 8:00 PM" / "Tomorrow, 8:00 AM" / "As needed"
};

// Next ring time for a schedule. Daily is exact; other frequencies use the next listed time
// (the Reminders team owns the full frequency logic).
export function nextOccurrence(s: ReminderSchedule, now = new Date()): Date | null {
  if (!s.sched_reminder_time.length) return null;
  const start = parseDate(s.sched_start_date);
  const end = parseDate(s.sched_end_date);
  if (end) end.setHours(23, 59, 59, 999);

  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);
    if (start && day < start) continue;
    const times = [...s.sched_reminder_time].sort();
    for (const t of times) {
      const [h, m] = t.split(':').map(Number);
      const at = new Date(day);
      at.setHours(h || 0, m || 0, 0, 0);
      if (at <= now) continue;
      if (end && at > end) return null;
      return at;
    }
  }
  return null;
}

function whenLabel(next: Date | null, s: ReminderSchedule, now = new Date()): string {
  if (!next) return s.sched_frequency_type || 'As needed';
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = new Date(next);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const time = formatTime(`${next.getHours()}:${String(next.getMinutes()).padStart(2, '0')}`);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  return `${d.toDateString().slice(4, 10)}, ${time}`;
}

// Active reminders of one profile, soonest first.
export function getUpcomingReminders(
  profileId: number | string | null,
  medicines: VaultMedicine[],
  now = new Date(),
): UpcomingReminder[] {
  if (profileId === null) return [];
  return getMockReminders()
    .filter((s) => s.sched_is_active && String(s.profile_id) === String(profileId))
    .map((s) => {
      const next = nextOccurrence(s, now);
      return {
        schedule: s,
        medicine: medicines.find((m) => m.fda_registration_id === s.fda_registration_id) ?? null,
        next,
        label: whenLabel(next, s, now),
      };
    })
    // keep "as needed" ones, drop ones that already ended
    .filter((r) => r.next !== null || r.schedule.sched_reminder_time.length === 0)
    .sort((a, b) => (a.next?.getTime() ?? Infinity) - (b.next?.getTime() ?? Infinity));
}
