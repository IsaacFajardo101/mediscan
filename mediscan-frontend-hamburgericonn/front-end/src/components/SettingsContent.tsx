import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Camera } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Screen = 'Settings' | 'Display' | 'Language' | 'Notifications' | 'Offline Database' | 'Privacy' | 'FAQs' | 'About MediScan' | 'Privacy Policy' | 'Terms of Service' | 'Open Source Licenses';

const GREEN = '#164F43';
const LIGHT_GREEN = '#8FB5A0';
const SELECTED_LIGHT = '#8DB29B';
const BG = '#F8FAFB';
const TEXT = '#18312F';
const BORDER = '#E0E5E5';


const FAQS = [
  {
    question: 'How do I scan a medicine?',
    answer: 'Tap the button at the bottom of the screen, choose \"Scan with Camera\", then place the medicine label inside the frame and tap the shutter. MediScan will read the name and expiration date for you.',
  },
  {
    question: "What if the app can't read the label?",
    answer: "If the app can't read the label, it will display a message indicating that the photo is blurry or unreadable. Mediscan will then give you the option to rescan, choose a different photo, or enter the medicine details manually.",
  },
  {
    question: 'How do I add a medicine manually?',
    answer: 'To add a medicine manually, press the plus (+) button in the middle of the footer. Two options will appear: scan and enter manually. Select Enter Manually to input the medicine details yourself.',
  },
  {
    question: 'How do reminders work?',
    answer: 'Reminders allow you to select a medicine from the vault, set its start date, reminder time, frequency, and assigned family member. Mediscan can then notify you through notifications, vibration, or sound to help you keep track of your medicines.',
  },
  {
    question: 'How do I add a family member?',
    answer: 'To add a family member, go to the Profile button in the footer and select Add a Profile. You can then create a profile for the family member you want to manage.',
  },
  {
    question: 'How does syncing work?',
    answer: 'Syncing works by comparing the data stored on your device with the data on the server to determine which version is the most up-to-date. If your device has the latest data, it will update the server. If the server has the latest data, your device will sync with the server to retrieve the updated information.',
  },
  {
    question: 'Is my data private?',
    answer: 'Yes, Mediscan is designed to protect your personal information by limiting access to authorized users and securely handling your data. Your information is stored and managed to help maintain its confidentiality and prevent unauthorized access.',
  },
];

export default function SettingsContent({ onBack }: { onBack?: () => void }) {
  const [screen, setScreen] = useState<Screen>('Settings');
  const [appearance, setAppearance] = useState('Light');
  const [language, setLanguage] = useState('English');
  const [textSize, setTextSize] = useState(16);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [medicineReminders, setMedicineReminders] = useState(true);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [syncModal, setSyncModal] = useState<'closed' | 'syncing' | 'complete'>('closed');
  const [clearCacheModal, setClearCacheModal] = useState(false);
  const [lastSynced, setLastSynced] = useState('Today, 9:32 AM');
  const [openLicense, setOpenLicense] = useState<string | null>(null);


  useEffect(() => {
    let mounted = true;
    Camera.getCameraPermissionsAsync()
      .then((result) => { if (mounted) setCameraEnabled(result.granted); })
      .catch(() => { if (mounted) setCameraEnabled(false); });
    return () => { mounted = false; };
  }, []);


  const goBack = () => {
    if (screen === 'Settings') {
      onBack?.();
    } else if (screen === 'Terms of Service' || screen === 'Privacy Policy' || screen === 'Open Source Licenses') {
      setScreen('About MediScan');
    } else {
      setScreen('Settings');
    }
  };
  const openScreen = (next: Screen) => setScreen(next);


  const toggleCamera = async (value: boolean) => {
    if (!value) {
      setCameraEnabled(false);
      Alert.alert('Camera permission', 'The app switch is off. To revoke device permission itself, open your phone Settings and change MediScan camera access.');
      return;
    }
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      setCameraEnabled(result.granted);
      if (!result.granted) Alert.alert('Permission needed', 'Allow camera access in your device settings to use camera features.');
    } catch {
      setCameraEnabled(false);
      Alert.alert('Camera permission', 'Camera permission could not be requested on this device.');
    }
  };


  const startSync = () => {
    setSyncModal('syncing');
    setTimeout(() => {
      setLastSynced('Today, 9:41 AM');
      setSyncModal('complete');
    }, 2200);
  };



  const Header = ({ title }: { title: string }) => (
    <SafeAreaView edges={['top']} style={styles.headerSafe}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          style={styles.backButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={screen === 'Settings' ? 'Open menu' : 'Go back'}
        >
          <Ionicons name="arrow-back" size={25} color={GREEN} />
        </Pressable>

        <Text style={styles.headerTitle}>{title}</Text>

        <View style={{ width: 36 }} />
      </View>
    </SafeAreaView>
  );

  const ProfileCard = () => (
    <View style={styles.profileCard}>
      <View style={[styles.avatar, styles.avatarPlaceholder]}><Ionicons name="person" size={27} color="#64847D" /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.profileName}>Maria Batumbakal</Text>
        <Text style={styles.email}>mariabatumbakal@email.com</Text>
      </View>
    </View>
  );


  const SettingRow = ({ icon, title, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; value?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]} accessibilityRole="button">
      {title === 'Appearance' ? (
        <View style={styles.appearanceRowIcon}>
          {/* Crescent outline with a half-sun tucked into its open side, matching the reference icon */}
          <Ionicons name="moon-outline" size={23} color="#64847D" style={styles.appearanceMoonGlyph} />
          <View style={styles.appearanceSunGraphic}>
            <View style={styles.appearanceSunCircle} />
            <View style={styles.sunRayTop} />
            <View style={styles.sunRayUpperRight} />
            <View style={styles.sunRayRight} />
          </View>
        </View>
      ) : <Ionicons name={icon} size={21} color="#64847D" />}
      <Text style={[styles.rowTitle, { fontSize: Math.max(textSize, 17) }]}>{title}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={21} color="#64847D" />
    </Pressable>
  );


  const SectionTitle = ({ children }: { children: string }) => <Text style={styles.sectionTitle}>{children}</Text>;
  const ToggleRow = ({ title, value, onValueChange }: { title: string; value: boolean; onValueChange: (value: boolean) => void }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleTitle}>{title}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#D8DEDD', true: LIGHT_GREEN }} thumbColor={value ? GREEN : '#F7F9F9'} />
    </View>
  );


  const SettingsScreen = () => (
    <>
      <Header title="Settings" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileCard />
        <SectionTitle>Preferences</SectionTitle>
        <View style={styles.group}>
          <SettingRow icon="sunny-outline" title="Appearance" onPress={() => openScreen('Display')} />
          <SettingRow icon="globe-outline" title="Language" value={language} onPress={() => openScreen('Language')} />
          <SettingRow icon="notifications-outline" title="Notifications" onPress={() => openScreen('Notifications')} />
        </View>
        <SectionTitle>Data &amp; Sync</SectionTitle>
        <View style={styles.group}><SettingRow icon="sync-outline" title="Offline Database" onPress={() => openScreen('Offline Database')} /></View>
        <SectionTitle>Security &amp; Privacy</SectionTitle>
        <View style={styles.group}><SettingRow icon="shield-outline" title="Privacy" onPress={() => openScreen('Privacy')} /></View>
        <SectionTitle>Support</SectionTitle>
        <View style={styles.group}>
          <SettingRow icon="help-circle-outline" title="FAQs" onPress={() => openScreen('FAQs')} />
          <SettingRow icon="information-circle-outline" title="About MediScan" onPress={() => openScreen('About MediScan')} />
        </View>
      </ScrollView>
    </>
  );


  const DisplayScreen = () => (
    <>
      <Header title="Display" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.displaySectionTitle}>Appearance</Text>
        <View style={styles.appearanceRow}>
          {[
            { title: 'Light', icon: 'sunny-outline' as const },
            { title: 'Dark', icon: 'moon-outline' as const },
            { title: 'System', icon: 'phone-portrait-outline' as const },
          ].map(option => {
            const selected = appearance === option.title;
            return <Pressable key={option.title} onPress={() => setAppearance(option.title)} style={[styles.appearanceCard, selected && styles.appearanceSelected]}>
              <View style={styles.appearanceIcon}>
                {option.title === 'System' ? (
                  <View style={styles.systemIcon}>
                    {/* Thin custom outline: desktop monitor behind, phone in front */}
                    <View style={[styles.desktopMonitor, { borderColor: selected ? 'white' : GREEN }]}>
                      <View style={[styles.monitorStand, { backgroundColor: selected ? 'white' : GREEN }]} />
                      <View style={[styles.monitorFoot, { backgroundColor: selected ? 'white' : GREEN }]} />
                    </View>
                    <View style={[styles.systemPhone, { borderColor: selected ? 'white' : GREEN, backgroundColor: selected ? SELECTED_LIGHT : 'white' }]}>
                      <View style={[styles.phoneSpeaker, { backgroundColor: selected ? 'white' : GREEN }]} />
                    </View>
                  </View>
                ) : <Ionicons name={option.icon} size={18} color={selected ? 'white' : GREEN} />}
              </View>
              <Text style={[styles.appearanceText, selected && styles.selectedText]}>{option.title}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={styles.displaySectionTitle}>Text Size</Text>
        <View style={styles.sliderCard}>
          <Text style={styles.smallA}>A</Text>
          <View style={styles.sliderWrap}>
            <View pointerEvents="none" style={styles.sliderTicks}>
              {[0, 1, 2, 3, 4].map((tick) => <View key={tick} style={[styles.sliderTick, (textSize >= 12 + tick * 3) && styles.sliderTickActive]} />)}
            </View>
            <Slider style={styles.slider} minimumValue={12} maximumValue={24} step={3} value={Math.round((textSize - 12) / 3) * 3 + 12} onValueChange={setTextSize} minimumTrackTintColor={GREEN} maximumTrackTintColor="#D5D9D8" thumbTintColor="#FFFFFF" />
          </View>
          <Text style={styles.largeA}>A</Text>
        </View>
        <SectionTitle>Preview</SectionTitle>
        <View style={styles.previewCard}>
          <Text style={[styles.previewTitle, { fontSize: textSize }]}>Sample Reminder</Text>
          <Text style={[styles.previewDescription, { fontSize: Math.max(11, textSize - 3) }]}>This is how your medicine reminders and text will look throughout the app.</Text>
        </View>
      </ScrollView>
    </>
  );


  const LanguageScreen = () => (
    <>
      <Header title="Language" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionTitle>Language</SectionTitle>
        {['English', 'Filipino'].map(item => (
          <Pressable key={item} onPress={() => setLanguage(item)} style={styles.languageCard}>
            <Text style={styles.languageText}>{item}</Text>
            {language === item && <Ionicons name="checkmark" size={23} color={GREEN} />}
          </Pressable>
        ))}
      </ScrollView>
    </>
  );


  const NotificationsScreen = () => (
    <>
      <Header title="Notifications" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionTitle>General</SectionTitle>
        <View style={styles.group}>
          <ToggleRow title="Push Notifications" value={pushNotifications} onValueChange={value => {
            setPushNotifications(value);
            Alert.alert('Push Notifications', value
              ? 'This switch is currently an in-app preference only. Actual OS notification permission is not connected in this Expo Go version.'
              : 'The app preference is off. This does not revoke notification permission in phone settings.');
          }} />
        </View>
        <SectionTitle>Reminders</SectionTitle>
        <View style={styles.group}><ToggleRow title="Medication Reminders" value={medicineReminders} onValueChange={setMedicineReminders} /></View>
        <SectionTitle>Sound &amp; Vibration</SectionTitle>
        <View style={styles.group}>
          <ToggleRow title="Sound" value={sound} onValueChange={setSound} />
          <ToggleRow title="Vibration" value={vibration} onValueChange={setVibration} />
        </View>
      </ScrollView>
    </>
  );


  const OtherScreen = () => {
    if (screen === 'Offline Database') return <>
      <Header title="Data & Sync" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.syncContent}>
        <SectionTitle>Storage</SectionTitle>
        <View style={styles.syncInfoCard}>
          <View>
            <Text style={styles.syncSmallLabel}>Last Synced</Text>
          </View>
          <Text style={styles.syncTimestamp}>{lastSynced}</Text>
        </View>
        <Pressable
          onPress={startSync}
          style={({ pressed }) => [styles.syncNowButton, pressed && styles.syncNowPressed]}
          accessibilityRole="button"
        >
          <Ionicons name="sync-outline" size={15} color="#FFFFFF" />
          <Text style={styles.syncNowText}>Sync Now</Text>
        </Pressable>
        <SectionTitle>Options</SectionTitle>
        <Pressable
          onPress={() => setClearCacheModal(true)}
          style={({ pressed }) => [styles.clearCacheButton, pressed && styles.clearCachePressed]}
          accessibilityRole="button"
        >
          <Text style={styles.clearCacheText}>Clear Cache</Text>
          <Ionicons name="chevron-forward" size={19} color="#64847D" />
        </Pressable>
      </ScrollView>
      <Modal
        visible={syncModal !== 'closed'}
        transparent
        animationType="fade"
        onRequestClose={() => setSyncModal('closed')}
      >
        <View style={styles.syncModalBackdrop}>
          <View style={styles.syncModalCard}>
            {syncModal === 'syncing' ? (
              <>
                <View style={styles.syncModalIcon}>
                  <Ionicons name="sync-outline" size={23} color="#4B8075" />
                </View>
                <Text style={styles.syncModalTitle}>Syncing your data...</Text>
                <Text style={styles.syncModalDescription}>
                  Uploading medicines, reminders and profiles to cloud. Please keep the app open.
                </Text>
                <View style={styles.progressTrack}>
                  <View style={styles.progressFill} />
                </View>
                <Text style={styles.progressPercent}>65%</Text>
              </>
            ) : (
              <>
                <View style={styles.syncModalIcon}>
                  <Ionicons name="cloud-outline" size={24} color="#4B8075" />
                </View>
                <Text style={styles.syncModalTitle}>Sync Complete</Text>
                <Text style={styles.syncModalDescription}>All your data is backed up. Last synced: {lastSynced}</Text>
                <Pressable onPress={() => setSyncModal('closed')} style={styles.doneButton}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={clearCacheModal}
        transparent
        animationType="fade"
        onRequestClose={() => setClearCacheModal(false)}
      >
        <View style={styles.syncModalBackdrop}>
          <View style={styles.clearCacheModalCard}>
            <View style={styles.clearCacheModalIcon}>
              <Ionicons name="trash-outline" size={22} color="#D84A43" />
            </View>
            <Text style={styles.clearCacheModalTitle}>Clear cache?</Text>
            <Text style={styles.clearCacheModalDescription}>Temporary files and scan images will be removed. Your medicines and reminders will not be affected.</Text>
            <View style={styles.clearCacheActions}>
              <Pressable onPress={() => setClearCacheModal(false)} style={styles.cancelCacheButton}>
                <Text style={styles.cancelCacheText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { setClearCacheModal(false); Alert.alert('Cache cleared', 'Temporary cache clearing is a visual demo in this version. Your medicine records were not changed.'); }} style={styles.confirmCacheButton}>
                <Text style={styles.confirmCacheText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>;
    if (screen === 'Privacy') return <>
      <Header title="Privacy" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle>Data &amp; Permissions</SectionTitle>
        <View style={styles.group}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Camera Access</Text>
            <Switch value={cameraEnabled} onValueChange={toggleCamera} trackColor={{ false: '#D8DEDD', true: LIGHT_GREEN }} thumbColor={cameraEnabled ? GREEN : '#F7F9F9'} />
          </View>
        </View>
      </ScrollView>
    </>;
    if (screen === 'FAQs') {
      const filteredFaqs = FAQS.filter(item =>
        item.question.toLowerCase().includes(faqSearch.trim().toLowerCase()) ||
        item.answer.toLowerCase().includes(faqSearch.trim().toLowerCase())
      );
      return <>
        <Header title="FAQs" />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#64847D" />
            <TextInput
              value={faqSearch}
              onChangeText={setFaqSearch}
              placeholder="Search questions..."
              placeholderTextColor="#879590"
              style={styles.searchInput}
              accessibilityLabel="Search frequently asked questions"
            />
            {faqSearch.length > 0 && (
              <Pressable onPress={() => setFaqSearch('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={19} color="#64847D" />
              </Pressable>
            )}
          </View>
          {filteredFaqs.length === 0 ? (
            <View style={styles.previewCard}><Text style={styles.faqAnswer}>No matching questions. Try a different search.</Text></View>
          ) : filteredFaqs.map(item => {
            const expanded = openFaq === item.question;
            return (
              <Pressable key={item.question} onPress={() => setOpenFaq(expanded ? null : item.question)} style={styles.faqCard} accessibilityRole="button">
                <View style={styles.faqTitleRow}>
                  <Text style={[styles.rowTitle, { flex: 1 }]}>{item.question}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={GREEN} />
                </View>
                {expanded && item.answer.length > 0 && <Text style={styles.faqAnswer}>{item.answer}</Text>}
              </Pressable>
            );
          })}
          <Text style={styles.faqHelp}>Still need help? Email us at support@mediscan.app</Text>
        </ScrollView>
      </>;
    }
    if (screen === 'About MediScan') return <>
      <Header title="About MediScan" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.aboutContent} showsVerticalScrollIndicator={false}>
        <View style={styles.aboutBrand}>
          <Image source={require('../../assets/images/logo/mediscan-icon.png')} style={styles.aboutLogo} resizeMode="contain" />
          <Text style={styles.aboutName}>MediScan</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0 (Build 42)</Text>
        </View>
        <Text style={styles.aboutSectionTitle}>Legal</Text>
        <View style={styles.aboutLinks}>
          <Pressable onPress={() => openScreen('Terms of Service')} style={styles.aboutLink}>
            <Text style={styles.termsOfServiceLinkText}>Terms of Service</Text><Ionicons name="chevron-forward" size={19} color="#315F56" />
          </Pressable>
          <Pressable onPress={() => openScreen('Privacy Policy')} style={styles.aboutLink}>
            <Text style={styles.aboutLinkText}>Privacy Policy</Text><Ionicons name="chevron-forward" size={19} color="#315F56" />
          </Pressable>
          <Pressable onPress={() => openScreen('Open Source Licenses')} style={styles.aboutLink}>
            <Text style={styles.aboutLinkText}>Open Source Licenses</Text><Ionicons name="chevron-forward" size={19} color="#315F56" />
          </Pressable>
        </View>
      </ScrollView>
    </>;
    if (screen === 'Privacy Policy') return <>
      <Header title="Privacy Policy" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.legalPageContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: October 5, 2026</Text>
        <Text style={styles.legalHeading}>Information We Collect</Text>
        <Text style={styles.legalBody}>Your Google account name and email, family profiles you create, medicines you scan or enter, and reminder settings.</Text>
        <Text style={styles.legalHeading}>Camera Access</Text>
        <Text style={styles.legalBody}>The camera is used only to scan medicine labels. Photos are processed to read text and are not shared.</Text>
        <Text style={styles.legalHeading}>How We Use Your Data</Text>
        <Text style={styles.legalBody}>To show your medicine list, send expiration alerts and reminders, and sync your data across devices.</Text>
        <Text style={styles.legalHeading}>Data Storage &amp; Sync</Text>
        <Text style={styles.legalBody}>Your data is stored on your device and backed up to our servers when you tap Sync.</Text>
        <Text style={styles.legalHeading}>Your Choices</Text>
        <Text style={styles.legalBody}>You can turn off camera access in Settings &gt; Privacy or remove profiles at any time.</Text>
      </ScrollView>
    </>;
    if (screen === 'Terms of Service') return <>
      <Header title="Terms of Service" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.legalPageContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: October 5, 2026</Text>
        <Text style={styles.legalHeading}>1. Acceptance of Terms</Text>
        <Text style={styles.legalBody}>By creating an account or using MediScan, you agree to these Terms. If you do not agree, please do not use the app.</Text>
        <Text style={styles.legalHeading}>2. Use of the App</Text>
        <Text style={styles.legalBody}>MediScan helps you organize medicines, track expiration dates and set reminders for your family. It is intended for personal, non-commercial use.</Text>
        <Text style={styles.legalHeading}>3. Your Account</Text>
        <Text style={styles.legalBody}>You sign in using your Google account. You are responsible for keeping your device and account secure.</Text>
        <Text style={styles.legalHeading}>4. Not Medical Advice</Text>
        <Text style={styles.legalBody}>Scan results and reminders are for organization only and do not replace advice from a doctor or pharmacist. Always verify medication details on the package.</Text>
        <Text style={styles.legalHeading}>5. Changes to These Terms</Text>
        <Text style={styles.legalBody}>We may update these Terms from time to time. Continued use of MediScan means you accept the updated Terms.</Text>
      </ScrollView>
    </>;
    if (screen === 'Open Source Licenses') {
      const licenses = [
        { title: 'Text Recognition / OCR Library', subtitle: 'Apache License 2.0' },
        { title: 'UI Framework', subtitle: 'MIT License' },
        { title: 'Local Database Library', subtitle: 'Public Domain' },
        { title: 'Date & Time Utilities', subtitle: 'MIT License' },
        { title: 'Icon Set', subtitle: 'ISC License' },
      ];
      return <>
        <Header title="Open Source Licenses" />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.licensePageContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.licenseIntro}>MediScan is built with the help of these open source projects.</Text>
          {licenses.map(item => {
            return <View key={item.title} style={styles.licenseCard}>
              <View style={styles.licenseRow}>
                <View style={styles.licenseLabels}>
                  <Text style={styles.licenseTitle}>{item.title}</Text>
                  <Text style={styles.licenseSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-down" size={17} color="#71827E" />
              </View>
            </View>;
          })}
        </ScrollView>
      </>;
    }
    return <>
      <Header title="Terms of Service" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.legalPageContent}>
        <Text style={styles.lastUpdated}>Last updated: October 5, 2026</Text>
        <Text style={styles.legalHeading}>4. Not Medical Advice</Text>
        <Text style={styles.legalBody}>Scan results and reminders are for organization only and do not replace advice from a doctor or pharmacist. Always verify medication details on the package.</Text>
      </ScrollView>
    </>;
  };


  return (
    <View style={styles.container}>
      <View style={styles.main}>
        {screen === 'Settings' && <SettingsScreen />}
        {screen === 'Display' && <DisplayScreen />}
        {screen === 'Language' && <LanguageScreen />}
        {screen === 'Notifications' && <NotificationsScreen />}
        {!['Settings', 'Display', 'Language', 'Notifications'].includes(screen) && <OtherScreen />}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  main: { flex: 1, minHeight: 0 },
  menuScreen: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF' },
  menuDrawer: { width: '80%', height: '100%', flexDirection: 'column', backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#D9E0E0' },
  menuBlankBackground: { flex: 1, backgroundColor: '#FFFFFF' },
  menuHeader: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, gap: 8 },
  menuBackButton: { width: 38, alignItems: 'flex-start', justifyContent: 'center' },
  menuBrandIcon: { width: 56, height: 56, borderRadius: 12 },
  menuBrandTitle: { color: '#0D2926', fontSize: 21, fontWeight: '700' },
  menuProfileCard: { minHeight: 90, marginHorizontal: 24, marginTop: 12, marginBottom: 28, paddingHorizontal: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E5E5', borderRadius: 13, elevation: 1 },
  menuAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D9EAF8' },
  menuProfileDetails: { flex: 1, minWidth: 0 },
  menuProfileName: { color: TEXT, fontSize: 17, fontWeight: '800' },
  menuEmail: { color: '#697B79', fontSize: 10, marginTop: 4 },
  menuOptions: { marginHorizontal: 24, gap: 9 },
  menuOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E7EBEB', borderRadius: 10, backgroundColor: BG },
  menuOptionText: { flex: 1, color: '#111D1B', fontSize: 13, fontWeight: '600' },
  menuLogoutArea: { marginTop: 'auto', minHeight: 68, paddingHorizontal: 28, paddingVertical: 10, justifyContent: 'center', backgroundColor: '#D8F0DE' },
  menuLogoutButton: { minHeight: 44, borderRadius: 9, backgroundColor: '#173D35', alignItems: 'center', justifyContent: 'center' },
  menuLogoutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  headerSafe: { backgroundColor: BG,},
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG, },
  backButton: { width: 36, height: 44, alignItems: 'flex-start', justifyContent: 'center', },
  headerTitle: { fontSize: 21, fontWeight: '700', color: TEXT },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 30 },
  profileCard: { minHeight: 82, backgroundColor: 'white', borderRadius: 13, borderWidth: 1, borderColor: '#EDF0F0', flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 22, gap: 12, elevation: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#D9EAF8', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholder: { borderWidth: 1, borderColor: '#D3E1DE' },
  profileName: { fontSize: 19, fontWeight: '800', color: TEXT },
  email: { color: '#697B79', fontSize: 10, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 9, marginTop: 5 },
  displaySectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 9, marginTop: 5, alignSelf: 'stretch', textAlign: 'left' },
  group: { backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, borderRadius: 12, marginBottom: 19, overflow: 'hidden' },
  settingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F0' },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },
  rowValue: { fontSize: 12, color: LIGHT_GREEN },
  pressed: { backgroundColor: '#EDF4F1' },
  appearanceRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  appearanceCard: { flex: 1, height: 82, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E9E8', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 7, elevation: 1 },
  appearanceSelected: { backgroundColor: SELECTED_LIGHT, borderColor: SELECTED_LIGHT },
  appearanceIcon: { minHeight: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  systemIcon: { width: 30, height: 21, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  desktopMonitor: { position: 'absolute', width: 23, height: 15, borderWidth: 1, borderRadius: 2, left: 9, top: 3 },
  monitorStand: { position: 'absolute', width: 1, height: 3, bottom: -3, alignSelf: 'center' },
  monitorFoot: { position: 'absolute', width: 7, height: 1, bottom: -4, alignSelf: 'center', borderRadius: 1 },
  systemPhone: { position: 'absolute', width: 9, height: 19, borderWidth: 1, borderRadius: 2, left: 2, top: 2, zIndex: 2, alignItems: 'center', justifyContent: 'flex-start' },
  phoneSpeaker: { width: 3, height: 0.8, borderRadius: 1, marginTop: 2 },
  appearanceRowIcon: { width: 21, height: 29, position: 'relative', marginRight: 0, justifyContent: 'center' },
  appearanceMoonGlyph: { position: 'absolute', left: -1, top: 3, zIndex: 3 },
  appearanceSunGraphic: { position: 'absolute', left: 8, top: -4, width: 15, height: 20, zIndex: 1 },
  appearanceSunCircle: { position: 'absolute', left: 2, top: 8, width: 9, height: 9, borderWidth: 1.3, borderColor: '#64847D', borderRadius: 4.5 },
  sunRayTop: { position: 'absolute', left: 6, top: 1, width: 1.2, height: 2.5, backgroundColor: '#64847D', borderRadius: 1 },
  sunRayUpperRight: { position: 'absolute', left: 11, top: 4, width: 1.2, height: 2.5, backgroundColor: '#64847D', borderRadius: 1, transform: [{ rotate: '45deg' }] },
  sunRayRight: { position: 'absolute', left: 11, top: 12, width: 2.5, height: 1.2, backgroundColor: '#64847D', borderRadius: 1 },
  syncContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 30 },
  syncInfoCard: { minHeight: 54, borderWidth: 1, borderColor: '#DDE2E1', borderRadius: 9, backgroundColor: '#FFFFFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  syncSmallLabel: { color: '#526662', fontSize: 14, fontWeight: '600' },
  syncTimestamp: { color: LIGHT_GREEN, fontSize: 14, fontWeight: '500' },
  syncNowButton: { minHeight: 40, borderRadius: 7, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 19 },
  syncNowPressed: { opacity: 0.82 },
  syncNowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  clearCacheButton: { minHeight: 48, borderWidth: 1, borderColor: '#DDE2E1', borderRadius: 9, backgroundColor: '#FFFFFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearCachePressed: { backgroundColor: '#F4F7F6' },
  clearCacheText: { color: '#C85C5C', fontSize: 14, fontWeight: '600' },
  syncModalBackdrop: { flex: 1, backgroundColor: 'rgba(99, 117, 116, 0.68)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35 },
  syncModalCard: { width: '100%', maxWidth: 300, backgroundColor: '#FFFFFF', borderRadius: 13, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, alignItems: 'center', elevation: 8 },
  syncModalIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DDF1E1', alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  syncModalTitle: { color: TEXT, fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  syncModalDescription: { color: '#6B7C78', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  progressTrack: { width: '100%', height: 4, backgroundColor: '#E4EAE7', borderRadius: 3, overflow: 'hidden', marginTop: 1 },
  progressFill: { width: '65%', height: '100%', backgroundColor: '#3FA58D', borderRadius: 3 },
  progressPercent: { color: '#3FA58D', fontSize: 11, marginTop: 8 },
  doneButton: { width: '100%', minHeight: 34, borderRadius: 7, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  doneButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyScreen: { flex: 1, backgroundColor: BG },
  appearanceText: { fontSize: 14, color: '#315B53', fontWeight: '500' },
  selectedText: { color: 'white', fontWeight: '600' },
  sliderCard: { minHeight: 90, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#E3E7E6', marginBottom: 28, elevation: 1 },
  smallA: { color: GREEN, fontSize: 18, fontWeight: '600' },
  largeA: { color: GREEN, fontSize: 28, fontWeight: '600' },
  sliderWrap: { flex: 1, height: 54, justifyContent: 'center', marginHorizontal: 10 },
  slider: { width: '100%', height: 44, zIndex: 2 },
  sliderTicks: { position: 'absolute', left: 12, right: 12, top: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  sliderTick: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B8BFBD' },
  sliderTickActive: { backgroundColor: GREEN, width: 9, height: 9 },
  bottomNav: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 4, paddingTop: 5, paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navLabel: { color: '#18312F', fontSize: 10, fontWeight: '500' },
  navPlus: { width: 58, height: 58, borderRadius: 29, backgroundColor: GREEN, borderWidth: 4, borderColor: '#D7E9DD', alignItems: 'center', justifyContent: 'center', marginTop: -22, marginHorizontal: 3, elevation: 3 },
  previewCard: { minHeight: 100, padding: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDE2E1', borderRadius: 12 },
  previewTitle: { fontWeight: '700', color: TEXT, marginBottom: 8 },
  previewDescription: { color: '#667875', lineHeight: 20 },
  languageCard: { minHeight: 48, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDE2E1', borderRadius: 10, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languageText: { color: TEXT, fontSize: 14, fontWeight: '600' },
  toggleRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#EDF0F0' },
  toggleTitle: { color: TEXT, fontSize: 15, fontWeight: '600', flex: 1 },
  permissionNote: { fontSize: 12, lineHeight: 18, color: '#667875', padding: 13 },
  searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER, borderRadius: 10, backgroundColor: 'white', marginBottom: 12 },
  searchInput: { flex: 1, minHeight: 42, color: TEXT, fontSize: 15 },
  faqCard: { backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 13, marginBottom: 9 },
  faqTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  faqAnswer: { color: '#526662', fontSize: 15, lineHeight: 23, marginTop: 10 },
  faqHelp: { color: '#526662', fontSize: 12, lineHeight: 18, textAlign: 'center', alignSelf: 'stretch', marginTop: 8, marginBottom: 10 },
  legalTitle: { color: TEXT, fontWeight: '800', fontSize: 17, marginBottom: 10 },
  aboutContent: { width: '100%', paddingHorizontal: 22, paddingTop: 16, paddingBottom: 28 },
  aboutBrand: { alignItems: 'center', marginBottom: 20 },
  aboutLogo: { width: 76, height: 76, borderRadius: 38, marginBottom: 2 },
  aboutName: { color: TEXT, fontSize: 17, fontWeight: '700', marginTop: 1 },
  aboutVersion: { color: LIGHT_GREEN, fontSize: 12, marginTop: 5 },
  aboutSectionTitle: { color: TEXT, fontSize: 17, fontWeight: '700', marginTop: 0, marginBottom: 12 },
  aboutLinks: { gap: 10 },
  aboutLink: { minHeight: 56, borderWidth: 1, borderColor: '#D8DEDD', borderRadius: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aboutLinkText: { color: TEXT, fontSize: 16, fontWeight: '600' },
  termsOfServiceLinkText: { color: TEXT, fontSize: 14, fontWeight: '600' },
  legalPageContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 30 },
  lastUpdated: { color: '#7C8986', fontSize: 12, lineHeight: 17, marginBottom: 10 },
  legalHeading: { color: '#243B38', fontSize: 15, lineHeight: 21, fontWeight: '700', marginTop: 2, marginBottom: 6 },
  legalBody: { color: '#687875', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  licensePageContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 30 },
  licenseIntro: { color: '#687875', fontSize: 12, lineHeight: 16, marginBottom: 10 },
  licenseCard: { minHeight: 48, borderWidth: 1, borderColor: '#DDE2E1', borderRadius: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 7 },
  licenseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  licenseLabels: { flex: 1, paddingRight: 8 },
  licenseTitle: { color: '#334743', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  licenseSubtitle: { color: '#7B8986', fontSize: 12, lineHeight: 16, marginTop: 3 },
  licenseDetail: { color: '#687875', fontSize: 11, lineHeight: 15, marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: '#EEF1F0' },
  clearCacheModalCard: { width: '100%', maxWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 13, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, alignItems: 'center', elevation: 8 },
  clearCacheModalIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  clearCacheModalTitle: { color: TEXT, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  clearCacheModalDescription: { color: '#6B7C78', fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 12 },
  clearCacheActions: { width: '100%', flexDirection: 'row', gap: 8 },
  cancelCacheButton: { flex: 1, minHeight: 36, borderWidth: 1, borderColor: '#AAB9B5', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cancelCacheText: { color: '#35534D', fontSize: 13, fontWeight: '700' },
  confirmCacheButton: { flex: 1, minHeight: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D9342B' },
  confirmCacheText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
