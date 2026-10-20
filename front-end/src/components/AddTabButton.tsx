import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/display';
import { useMenu } from './MenuContext';

export const FAB_SIZE = 68;

// dito yung '+' button in the middle of the bottom bar.
// pati yung 'X' button that appears when the '+' is tapped is positioned exactly on top of this button.
export function FabCircle({ icon }: { icon: 'add' | 'close' }) {
  return (
    <View style={styles.fab}>
      <Ionicons name={icon} size={34} color="#fff" />
    </View>
  );
}

// The raised + button in the middle of the bottom bar.
export default function AddTabButton() {
  const { openAdd } = useMenu();
  const ref = useRef<View>(null);

  // naka measure dito yung button so that the "Add medicine" sheet can be positioned exactly on top of it.
  const onPress = () => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, w, h) => openAdd({ x, y, w, h }));
    } else {
      openAdd();
    }
  };

  return (
    <View style={styles.wrap}>
      <View ref={ref} collapsable={false} style={styles.raise}>
        <Pressable onPress={onPress} accessibilityLabel="Add medicine">
          <FabCircle icon="add" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  raise: { top: -26 },
  fab: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    borderWidth: 4, borderColor: Colors.primarySoft, // light ring around the button
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});