import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const notifications = [
  {
    id: '1',
    title: 'Medicine expiring soon',
    message: 'Vitamin C 1000mg expires in 5 days',
    time: '2h ago',
    color: '#B85C00',
  },
  {
    id: '2',
    title: 'Verification needed',
    message: 'Amoxicillin 500mg needs verification',
    time: '5h ago',
    color: '#B85C00',
  },
  {
    id: '3',
    title: 'Reminder',
    message: 'Time to take Paracetamol 500mg',
    time: 'Today, 9:00AM',
    color: '#278238',
  },
  {
    id: '4',
    title: 'Medicine expired',
    message: 'Ibuprofen 200mg has expired',
    time: '1d ago',
    color: '#FF1717',
  },
  {
    id: '5',
    title: 'Medicine expiring soon',
    message: 'Vitamin C 1000mg expires in 5 days',
    time: '2h ago',
    color: '#B85C00',
  },
  {
    id: '6',
    title: 'Verification needed',
    message: 'Amoxicillin 500mg needs verification',
    time: '5h ago',
    color: '#B85C00',
  },
  {
    id: '7',
    title: 'Reminder',
    message: 'Time to take Paracetamol 500mg',
    time: 'Today, 9:00AM',
    color: '#278238',
  },
  {
    id: '8',
    title: 'Medicine expired',
    message: 'Ibuprofen 200mg has expired',
    time: '1d ago',
    color: '#FF1717',
  },
  {
    id: '9',
    title: 'Medicine expiring soon',
    message: 'Vitamin C 1000mg expires in 5 days',
    time: '2h ago',
    color: '#B85C00',
  },
  {
    id: '10',
    title: 'Verification needed',
    message: 'Amoxicillin 500mg needs verification',
    time: '5h ago',
    color: '#B85C00',
  },
  {
    id: '11',
    title: 'Reminder',
    message: 'Time to take Paracetamol 500mg',
    time: 'Today, 9:00AM',
    color: '#278238',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)' as any);
            }
          }}
          style={styles.backButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={25} color="#12312F" />
        </Pressable>

        <Text style={styles.headerTitle}>Notifications</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeading}>
              <View
                style={[styles.dot, { backgroundColor: item.color }]}
              />
              <Text style={styles.title}>{item.title}</Text>
            </View>

            <Text style={styles.message}>{item.message}</Text>

            <Text style={[styles.time, { color: item.color }]}>
              {item.time}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  header: {
    height: 62,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#D8DEE3',
  },
  backButton: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '700',
    color: '#102B2A',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E0E3E6',
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 9,
    minHeight: 83,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: '#102B2A',
  },
  message: {
    fontSize: 13,
    color: '#707070',
    marginLeft: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 20,
  },
});
