import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'mediscan.session.v1';

export type Session = {
  access_token: string;
  token_type: 'bearer';
  account_id: string;
  email?: string;
  active_profile_id?: string | number;
};

export async function getSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function setActiveProfileId(profileId: string | number): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await saveSession({ ...session, active_profile_id: profileId });
}
