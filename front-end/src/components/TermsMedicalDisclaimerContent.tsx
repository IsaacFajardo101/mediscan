import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GREEN = '#164F43';
const BG = '#F8FAFB';
const TEXT = '#18312F';
const BORDER = '#E0E5E5';

export default function TermsMedicalDisclaimerContent({
  onBack,
}: {
  onBack?: () => void;
}) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => onBack?.()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to hamburger menu"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={GREEN} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Medical Disclaimer
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.divider} />

      {/* Disclaimer Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.legalPageContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: October 5, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.legalHeading}>For Information Only</Text>
          <Text style={styles.legalBody}>
            MediScan helps you keep track of medicines at home. It does not
            diagnose, treat or give medical advice.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.legalHeading}>Verify Scan Results</Text>
          <Text style={styles.legalBody}>
            Text recognition can make mistakes. Always double-check the medicine
            name, dosage and expiration date on the actual package.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.legalHeading}>Consult a Professional</Text>
          <Text style={styles.legalBody}>
            Ask your doctor or pharmacist before starting, stopping or changing
            any medicine.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.legalHeading}>Emergencies</Text>
          <Text style={styles.legalBody}>
            In case of a medical emergency or suspected overdose, call your local
            emergency number immediately.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: BG,
  },

  backButton: {
    width: 36,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },

  headerTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 28,
  },

  headerSpacer: {
    width: 36,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
  },

  scroll: {
    flex: 1,
  },

  legalPageContent: {
    paddingHorizontal: 28,
    paddingTop: 16, // Reduced padding to move everything further up
    paddingBottom: 40,
  },

  lastUpdated: {
    color: '#7C8986',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12, // Brought the details closer to the 'Last updated' text
    textAlign: 'left',
  },

  section: {
    width: '100%',
    marginBottom: 20, 
  },

  legalHeading: {
    color: '#243B38',
    fontSize: 15, 
    lineHeight: 21, 
    fontWeight: '800', // Increased from '700' to make the headers thicker
    marginBottom: 6,
    textAlign: 'left', 
  },

  legalBody: {
    color: '#687875',
    fontSize: 13, 
    lineHeight: 19, 
    textAlign: 'left',
  },
});