import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/display';

// Colors used only by the form frames in Figma that are not in the display.ts tokens yet.
export const FormColors = {
  inputBorder: '#C9D6CF',
  placeholder: '#9AAFA3',
  helper: '#5B6B6C',
  required: '#D93025',
};

type FieldProps = {
  label: string;
  required?: boolean;
  helper?: string;
  children: ReactNode; // usually an <InputBox>
};

// Label (with an optional red *), the input below it, and an optional helper line.
export function FormField({ label, required, helper, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.star}>*</Text>}
      </View>
      {children}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

// White 48px rounded box that holds a TextInput, a dropdown value, an icon, etc.
export function InputBox({ children }: { children: ReactNode }) {
  return <View style={styles.box}>{children}</View>;
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', gap: 3 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  star: { fontSize: 14, fontWeight: '700', color: FormColors.required },
  helper: { fontSize: 13, color: FormColors.helper },
  box: {
    height: 48,
    backgroundColor: Colors.onAction,
    borderWidth: 1,
    borderColor: FormColors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
});
