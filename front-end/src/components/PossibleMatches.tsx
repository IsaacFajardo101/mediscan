import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Radius, Spacing, Type } from '@/constants/display';
import type { MatchImage, PossibleMatch } from '@/data/mockScanResults';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const Amber = '#E89C38';
const SubtleText = '#7E7B77';
const NoteBg = '#FFE8CB';

type Props = {
  matches: PossibleMatch[];
  onSelect?: (match: PossibleMatch) => void;
};

// Photo inside a 95x80 slot, optionally zoomed/cropped like in Figma.
function MatchPhoto({ image }: { image: MatchImage }) {
  const { source, width, height, crop } = image;
  return (
    <View style={styles.photoSlot}>
      <View style={{ width, height, overflow: 'hidden' }}>
        <Image
          source={source}
          contentFit={crop ? 'fill' : 'cover'}
          style={crop ? { position: 'absolute', ...crop } : { width: '100%', height: '100%' }}
        />
      </View>
    </View>
  );
}

// "Possible Matches" heading, the tappable list of matches, and the warning note under it.
export default function PossibleMatches({ matches, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Possible Matches</Text>

      {matches.map((m) => (
        <Pressable
          key={m.id}
          style={styles.card}
          onPress={() => onSelect?.(m)}
          accessibilityRole="button"
          accessibilityLabel={`${m.name}, similarity ${m.similarity}%`}
        >
          <MatchPhoto image={m.image} />
          <View style={styles.cardText}>
            <View>
              <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
              <Text style={styles.category} numberOfLines={1}>{m.category}</Text>
            </View>
            <Text style={styles.similarity}>Similarity: {m.similarity}%</Text>
          </View>
        </Pressable>
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

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    padding: Spacing.sm + 2,
    backgroundColor: Colors.surfacePrimary,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: Radius.sm,
  },
  photoSlot: { width: 95, height: 80, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: Spacing.sm + 2 },
  name: { ...Type.label, color: Colors.textPrimary },
  category: { ...Type.caption, color: SubtleText },
  similarity: { ...Type.label, fontSize: 14, color: Amber, textAlign: 'right' },

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
