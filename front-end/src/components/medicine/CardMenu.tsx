import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Colors, Radius, Spacing, Type } from '@/constants/display';
import type { Anchor } from './MedicineCard';

// The small ⋮ menu that opens next to a medicine card.
export type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

type Props = { anchor: Anchor | null; items: MenuItem[]; onClose: () => void };

const MENU_W = 220;
const ITEM_H = 48;

export default function CardMenu({ anchor, items, onClose }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const rootRef = useRef<View>(null);
  // measure where the modal starts on screen, so the menu lines up with the ⋮ button
  const onLayout = () => {
    rootRef.current?.measureInWindow((x, y) => {
      if (x !== origin.x || y !== origin.y) setOrigin({ x, y });
    });
  };

  if (!anchor) return null;

  const menuH = items.length * ITEM_H + Spacing.sm;
  const ax = anchor.x - origin.x;
  const ay = anchor.y - origin.y;
  const left = Math.max(Spacing.md, Math.min(screenW - MENU_W - Spacing.md, ax + anchor.w - MENU_W));
  const below = ay + anchor.h + 4;
  const top = below + menuH > screenH - 80 ? Math.max(Spacing.md, ay - menuH - 4) : below;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View ref={rootRef} onLayout={onLayout} style={StyleSheet.absoluteFill} collapsable={false}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        <View style={[styles.menu, { left, top, width: MENU_W }]}>
          {items.map((it, i) => (
            <Pressable
              key={it.label}
              onPress={() => {
                onClose();
                // iOS can't open a new popup while this one is still closing, so wait a moment
                setTimeout(it.onPress, Platform.OS === 'ios' ? 350 : 0);
              }}
              style={({ pressed }) => [
                styles.item,
                it.danger && i > 0 && styles.divider,
                pressed && { backgroundColor: Colors.surfaceSecondary },
              ]}
              accessibilityRole="menuitem"
            >
              <Ionicons name={it.icon} size={20} color={it.danger ? Colors.statusDanger : Colors.textPrimary} />
              <Text style={[styles.label, it.danger && { color: Colors.statusDanger }]}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute', backgroundColor: Colors.surfacePrimary, borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  item: { height: ITEM_H, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, paddingHorizontal: Spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderDefault },
  label: { ...Type.body, color: Colors.textPrimary },
});
