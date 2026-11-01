import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Assets } from '@/constants/assets';
import { Colors, Radius, Spacing, Type } from '@/constants/display';
import type { MatchImage, PossibleMatch } from '@/data/mockScanResults';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const Amber = '#E89C38';
const SubtleText = '#7E7B77';
const SelectedBg = '#E8F4EF';

type Props = {
  match: PossibleMatch;
  selected?: boolean;
  showCheck?: boolean; // check badge in the corner (the Possible Matches list shows it, Edit Medicine does not)
  onPress?: () => void; // leave out for a card that is not tappable
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

// One medicine card: photo, name, category and similarity.
export default function PossibleMatchCard({ match, selected, showCheck, onPress }: Props) {
  const content = (
    <>
      <MatchPhoto image={match.image} />
      <View style={styles.text}>
        <View>
          <Text style={styles.name} numberOfLines={1}>{match.name}</Text>
          <Text style={styles.category} numberOfLines={1}>{match.category}</Text>
        </View>
        <Text style={styles.similarity}>Similarity: {match.similarity}%</Text>
      </View>
      {selected && showCheck ? (
        <Image source={Assets.icons.checkSelected} style={styles.check} contentFit="contain" />
      ) : null}
    </>
  );

  const style = [styles.card, selected && styles.cardSelected];

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <Pressable
      style={style}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${match.name}, similarity ${match.similarity}%`}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  // 2px border instead of 1px, so the padding is 1px smaller to keep the content in place
  cardSelected: {
    padding: Spacing.sm + 1,
    backgroundColor: SelectedBg,
    borderWidth: 2,
    borderColor: Colors.actionPrimary,
  },
  photoSlot: { width: 95, height: 80, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: Spacing.sm + 2 },
  name: { ...Type.label, color: Colors.textPrimary },
  category: { ...Type.caption, color: SubtleText },
  similarity: { ...Type.label, fontSize: 14, color: Amber, textAlign: 'right' },
  check: { position: 'absolute', top: 2, left: 2, width: 24, height: 24 },
});
