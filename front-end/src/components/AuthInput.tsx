import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/display';

type Props = TextInputProps & { label: string; password?: boolean };

// This part is yung input field na ginagamit sa Sign Up and Log In screens. It has a label, a text input, and optionally a show/hide password button.
export default function AuthInput({ label, password, ...rest }: Props) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted + '99'}
          secureTextEntry={password ? hidden : false}
          autoCapitalize="none"
          {...rest}
        />
        {password ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Show or hide password">
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md - 2 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  box: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    paddingHorizontal: Spacing.md - 2, borderRadius: Radius.md - 2,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 0 },
});