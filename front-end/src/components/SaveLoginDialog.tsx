import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Type } from '@/constants/display';

type Props = { visible: boolean; onAnswer: (save: boolean) => void };


export default function SaveLoginDialog({ visible, onAnswer }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onAnswer(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Save your login info?</Text>
          <Text style={styles.message}>
            Next time you open MediScan, your email and password will be filled in for you.
          </Text>
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.notNow]} onPress={() => onAnswer(false)}>
              <Text style={styles.notNowText}>Not now</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.save]} onPress={() => onAnswer(true)}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(5,31,32,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.lg - 4, alignItems: 'center',
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md - 2,
  },
  title: { ...Type.h3, color: Colors.text, textAlign: 'center' },
  message: {
    fontSize: 14, lineHeight: 20, color: Colors.textMuted, textAlign: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.md + 4,
  },
  row: { flexDirection: 'row', gap: Spacing.sm + 4, width: '100%' },
  btn: { flex: 1, height: 46, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  notNow: { borderWidth: 1.5, borderColor: Colors.text },
  notNowText: { ...Type.label, fontSize: 15, color: Colors.text },
  save: { backgroundColor: Colors.primary },
  saveText: { ...Type.label, fontSize: 15, color: '#fff' },
});