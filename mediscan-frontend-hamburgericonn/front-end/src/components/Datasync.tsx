import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSizes, Radius, Spacing, Type } from '@/constants/display';

const LAST_SYNCED_KEY = 'mediscan:lastSynced';
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function getLastSynced(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

function formatLastSynced(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = `${h}:${m} ${ampm}`;
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${time}`;
}

async function syncNow(onProgress: (percent: number) => void): Promise<void> {
  for (const percent of [15, 35, 60, 85, 100]) {
    await delay(500);
    onProgress(percent);
  }
  await AsyncStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
}

function SyncModal({
  visible, status, progress, onDone,
}: {
  visible: boolean;
  status: 'syncing' | 'done';
  progress: number;
  onDone: () => void;
}) {
  const done = status === 'done';
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (done) onDone(); 
      }}
    >
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <View style={modalStyles.iconCircle}>
            <Ionicons name={done ? 'checkmark' : 'sync'} size={28} color={Colors.primary} />
          </View>

          {done ? (
            <>
              <Text style={modalStyles.title}>Up to date</Text>
              <Text style={modalStyles.message}>
                Your medicines, reminders and profiles are synced.
              </Text>
              <Pressable style={modalStyles.doneBtn} onPress={onDone}>
                <Text style={modalStyles.doneText}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={modalStyles.title}>Syncing your data...</Text>
              <Text style={modalStyles.message}>
                Uploading medicines, reminders and profiles to the cloud. Please keep the app open.
              </Text>
              <View style={modalStyles.track}>
                <View style={[modalStyles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={modalStyles.percent}>{pct}%</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

type SyncStatus = 'idle' | 'syncing' | 'done';

export default function DataSync() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [lastSynced, setLastSynced] = useState('Never');

  useEffect(() => {
    getLastSynced().then((iso) => {
      if (iso) setLastSynced(formatLastSynced(iso));
    });
  }, []);

  const handleSync = async () => {
    if (status === 'syncing') return;
    setProgress(0);
    setStatus('syncing');
    try {
      await syncNow(setProgress);
      const iso = await getLastSynced();
      if (iso) setLastSynced(formatLastSynced(iso));
      setStatus('done'); 
    } catch (e) {
      console.warn('Sync failed', e);
      setStatus('idle');
    }
  };

  return (
    <>
      <Text style={styles.sectionTitle}>Data Sync</Text>
      <View style={styles.card}>
        <View style={styles.syncRow}>
          <View style={styles.syncIcon}>
            <Ionicons name="sync" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>Sync your data to the cloud</Text>
            <Text style={styles.syncSub}>Last synced: {lastSynced}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.syncBtn, pressed && { opacity: 0.8 }]}
          onPress={handleSync}
          disabled={status === 'syncing'}
        >
          <Ionicons name="sync" size={16} color="#fff" />
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </Pressable>
      </View>

      <SyncModal
        visible={status !== 'idle'}
        status={status === 'done' ? 'done' : 'syncing'}
        progress={progress}
        onDone={() => setStatus('idle')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontWeight: '700', color: Colors.text, fontSize: FontSizes.body,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  card: {
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, marginBottom: Spacing.md },
  syncIcon: {
    width: 36, height: 36, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  syncTitle: { fontWeight: '600', color: Colors.text, fontSize: FontSizes.body - 1 },
  syncSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    height: 44, borderRadius: Radius.sm, backgroundColor: Colors.primary,
  },
  syncBtnText: { color: '#fff', fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, backgroundColor: 'rgba(5,31,32,0.45)',
  },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.lg - 4, alignItems: 'center',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md - 2,
  },
  title: { ...Type.h3, color: Colors.text, textAlign: 'center' },
  message: {
    fontSize: 13, lineHeight: 19, color: Colors.textMuted, textAlign: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.md + 4,
  },
  track: {
    width: '100%', height: 8, borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },
  percent: { fontSize: 12, color: Colors.textMuted, marginTop: Spacing.sm },
  doneBtn: {
    width: '100%', height: 46, borderRadius: Radius.sm, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  doneText: { ...Type.label, fontSize: 15, color: '#fff' },
});