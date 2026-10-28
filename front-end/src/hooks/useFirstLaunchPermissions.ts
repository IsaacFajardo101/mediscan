// First time the app opens: ask the OS for camera + notification permission (doc requirement).
// Asked only once; after that, Settings > Privacy / Notifications handle turning them on/off.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

const KEY = 'mediscan.permissionsAsked.v1';
let started = false; // guards against asking twice if Home mounts twice

// Notification permission.
// Android: uses React Native's built-in PermissionsAndroid, NOT expo-notifications, because
// importing expo-notifications crashes in Expo Go on Android ("Cannot find native module
// 'ExpoTopicSubscriptionModule'") and that took the whole Home screen down with it.
// iOS: expo-notifications is loaded only here, inside try/catch, so it can never crash Home.
async function askNotificationPermission(): Promise<void> {
  if (Platform.OS === 'android') {
    // Android 13+ (API 33) needs this runtime permission; older Android has it on by default.
    if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      if (!(await PermissionsAndroid.check(permission))) {
        await PermissionsAndroid.request(permission);
      }
    }
    return;
  }
  if (Platform.OS === 'ios') {
    try {
      const Notifications = await import('expo-notifications');
      const current = await Notifications.getPermissionsAsync();
      if (!current.granted && current.canAskAgain) {
        await Notifications.requestPermissionsAsync();
      }
    } catch (e) {
      console.log('[permissions] notification request failed', e);
    }
  }
}

export function useFirstLaunchPermissions(): void {
  const [camera, requestCamera] = useCameraPermissions();

  useEffect(() => {
    if (!camera || started) return; // camera status still loading, or already done
    started = true;
    (async () => {
      try {
        if (await AsyncStorage.getItem(KEY)) return;
        await AsyncStorage.setItem(KEY, new Date().toISOString());
      } catch {
        // storage problem: still ask, worst case we ask again next launch
      }

      if (!camera.granted && camera.canAskAgain) {
        await requestCamera();
      }
      await askNotificationPermission();
    })().catch((e) => console.log('[permissions] first-launch request failed', e));
  }, [camera, requestCamera]);
}
