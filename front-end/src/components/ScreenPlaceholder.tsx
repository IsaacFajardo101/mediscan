import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/display';

// Para ito sa mga screens na wala pang laman, para may placeholder habang hindi pa tapos yung feature.
export default function ScreenPlaceholder({ name }: { name: string }) {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>{name} screen - work in progress</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  t: { color: Colors.textMuted },
});
