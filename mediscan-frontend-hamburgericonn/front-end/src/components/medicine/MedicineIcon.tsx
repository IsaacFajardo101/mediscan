import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Colors, Radius } from '@/constants/display';
import type { MedicineForm } from '@/types/medicine';

// Per the doc: no real medicine photos, show an icon based on the medicine type instead.
type Props = { form: MedicineForm; size?: number };

export default function MedicineIcon({ form, size = 56 }: Props) {
  const iconSize = Math.round(size * 0.45);
  const color = Colors.actionPrimary;
  let icon;
  switch (form) {
    case 'Tablet':
      icon = <Ionicons name="remove-circle-outline" size={iconSize} color={color} />;
      break;
    case 'Capsule':
      icon = <MaterialCommunityIcons name="pill" size={iconSize} color={color} />;
      break;
    case 'Syrup':
      icon = <MaterialCommunityIcons name="bottle-tonic-outline" size={iconSize} color={color} />;
      break;
    case 'Drops':
      icon = <MaterialCommunityIcons name="eyedropper" size={iconSize} color={color} />;
      break;
    case 'Inhaler':
      icon = <MaterialCommunityIcons name="spray" size={iconSize} color={color} />;
      break;
    case 'Injection':
      icon = <MaterialCommunityIcons name="needle" size={iconSize} color={color} />;
      break;
    default:
      icon = <MaterialCommunityIcons name="medical-bag" size={iconSize} color={color} />;
  }
  return (
    <View
      style={[styles.box, { width: size, height: size, borderRadius: size > 64 ? Radius.md : Radius.sm }]}
      accessibilityLabel={`${form} icon`}
    >
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
});
