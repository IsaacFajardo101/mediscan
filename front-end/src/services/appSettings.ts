// One place for the app's on/off settings (Settings > Notifications / Privacy).
// Saved on the phone, so they're remembered after the app is closed.
// Any screen can read them with useAppSettings() or getSettings().
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type AppSettings = {
  cameraEnabled: boolean;
  pushNotifications: boolean;
  medicationReminders: boolean;
  sound: boolean;
  vibration: boolean;
};

const STORAGE_KEY = 'mediscan.settings.v1';
const OLD_CAMERA_KEY = '@mediscan_camera_enabled'; // older version of the camera switch

export const DEFAULT_SETTINGS: AppSettings = {
  cameraEnabled: true,
  pushNotifications: false,
  medicationReminders: true,
  sound: true,
  vibration: true,
};

let current: AppSettings = { ...DEFAULT_SETTINGS };
let loaded = false;
let loading: Promise<AppSettings> | null = null;
const listeners = new Set<(settings: AppSettings) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener(current));
}

export function loadSettings(): Promise<AppSettings> {
  if (loaded) return Promise.resolve(current);
  if (!loading) {
    loading = (async () => {
      try {
        const [saved, oldCamera] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(OLD_CAMERA_KEY),
        ]);
        const parsed = saved ? (JSON.parse(saved) as Partial<AppSettings>) : {};
        current = { ...DEFAULT_SETTINGS, ...parsed };
        if (!saved && oldCamera !== null) current.cameraEnabled = oldCamera === 'true';
      } catch (error) {
        console.warn('[settings] could not load', error);
        current = { ...DEFAULT_SETTINGS };
      }
      loaded = true;
      notifyListeners();
      return current;
    })();
  }
  return loading;
}

export function getSettings(): AppSettings {
  return current;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  current = { ...current, ...patch };
  notifyListeners();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (error) {
    console.warn('[settings] could not save', error);
  }
  return current;
}

// React hook: [settings, ready]. Re-renders whenever a setting changes anywhere in the app.
export function useAppSettings(): [AppSettings, boolean] {
  const [settings, setSettings] = useState<AppSettings>(current);
  const [ready, setReady] = useState(loaded);
  useEffect(() => {
    const listener = (next: AppSettings) => {
      setSettings(next);
      setReady(true);
    };
    listeners.add(listener);
    void loadSettings().then(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return [settings, ready];
}

// ---------- Notifications ----------

// How notifications behave while the app is open (follows the Sound switch)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: current.pushNotifications,
    shouldShowList: current.pushNotifications,
    shouldPlaySound: current.pushNotifications && current.sound,
    shouldSetBadge: false,
  }),
});

// Android decides sound/vibration per "channel", so we keep one channel per combination
async function channelFor(settings: AppSettings): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  const id = `reminders-${settings.sound ? 'sound' : 'silent'}-${settings.vibration ? 'vibrate' : 'still'}`;
  await Notifications.setNotificationChannelAsync(id, {
    name: 'Medicine reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: settings.sound ? 'default' : null,
    enableVibrate: settings.vibration,
    vibrationPattern: settings.vibration ? [0, 250, 250, 250] : null,
  });
  return id;
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// Shows the phone's real "Allow notifications?" popup (if it can still be shown)
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await channelFor(current); // Android 13+ only shows the popup once a channel exists
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch (error) {
    console.warn('[settings] notification permission error', error);
    return false;
  }
}

// Sends a notification right away, following the Sound / Vibration switches
export async function sendNotification(title: string, body: string): Promise<boolean> {
  if (!current.pushNotifications) return false;
  if (!(await hasNotificationPermission())) return false;
  try {
    const channelId = await channelFor(current);
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: current.sound,
        vibrate: current.vibration ? [0, 250, 250, 250] : undefined,
      },
      trigger: channelId ? { channelId } : null,
    });
    return true;
  } catch (error) {
    console.warn('[settings] could not send notification', error);
    return false;
  }
}

// For the Reminders team: check this before scheduling a medicine reminder
export function remindersAllowed(): boolean {
  return current.pushNotifications && current.medicationReminders;
}

export async function cancelScheduledReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('[settings] could not cancel notifications', error);
  }
}

// Load saved settings as soon as the app starts
void loadSettings();