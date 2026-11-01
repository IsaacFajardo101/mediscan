import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Type } from '@/constants/display';
import type { PossibleMatch } from '@/data/mockScanResults';
import PossibleMatchCard from './PossibleMatchCard';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const Amber = '#E89C38';
const NoteBg = '#FFE8CB';

type Props = {
  matches: PossibleMatch[];
  selectedId?: string | null;
  onSelect?: (match: PossibleMatch) => void;
};

// "Possible Matches" heading, the tappable list of matches, and the warning note under it.
// Only one match can be selected at a time (the parent keeps `selectedId`).
export default function PossibleMatches({ matches, selectedId, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Possible Matches</Text>

      {matches.map((m) => (
        <PossibleMatchCard
          key={m.id}
          match={m}
          selected={m.id === selectedId}
          showCheck
          onPress={() => onSelect?.(m)}
        />
      ))}

      <View style={styles.note}>
        <Text style={styles.noteText}>
          These are possible matches only. Please scan the label, box, or blister pack for confirmation
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm + 2 },
  heading: { ...Type.h2, color: Colors.textPrimary, paddingVertical: Spacing.sm },

  note: {
    backgroundColor: NoteBg,
    borderWidth: 1,
    borderColor: Amber,
    borderRadius: Radius.sm,
    paddingVertical: 30,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  noteText: { ...Type.body, fontWeight: '500', color: '#000', textAlign: 'center' },
});
