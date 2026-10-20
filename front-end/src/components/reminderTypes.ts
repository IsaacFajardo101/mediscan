export type ReminderFrequency = 'Daily' | 'Weekly' | 'As needed';

export type Reminder = {
  id: string;
  medicine: string;
  category: string;
  instructions: string;
  time: string;
  frequency: ReminderFrequency;
  startDate: string;
  member: string;
  notes: string;
  enabled: boolean;
};

export type ReminderDraft = Omit<Reminder, 'id'> & { id?: string };

export const FAMILY_MEMBERS = ['Me', 'Mama', 'Papa', 'Sis', 'Brother'];

export const MEDICINES = [
  { name: 'Accupril', category: 'Tablet', instructions: 'Take 1 pill every morning' },
  { name: 'Amoxicillin Capsules', category: 'Capsule', instructions: 'Take 1 capsule with water' },
  { name: 'Paracetamol Biogesic', category: 'Tablet', instructions: 'Take 1 tablet as needed' },
  { name: 'Cetirizine Zyrtec', category: 'Tablet', instructions: 'Take 1 tablet each evening' },
  { name: 'Metformin Glucophage', category: 'Tablet', instructions: 'Take 1 tablet with a meal' },
];

export const SAMPLE_REMINDERS: Reminder[] = [
  {
    id: 'sample-accupril',
    medicine: 'Accupril',
    category: 'Tablet',
    instructions: 'Take 1 pill every morning',
    time: '6:00 AM',
    frequency: 'Daily',
    startDate: 'Aug 13, 2026',
    member: 'Mama',
    notes: '',
    enabled: true,
  },
  {
    id: 'sample-amoxicillin',
    medicine: 'Amoxicillin Capsules',
    category: 'Capsule',
    instructions: 'Take 1 capsule with water',
    time: '12:00 PM',
    frequency: 'Daily',
    startDate: 'Aug 13, 2026',
    member: 'Mama',
    notes: '',
    enabled: true,
  },
  {
    id: 'sample-paracetamol',
    medicine: 'Paracetamol Biogesic',
    category: 'Tablet',
    instructions: 'Take 1 tablet as needed',
    time: '8:00 PM',
    frequency: 'As needed',
    startDate: 'Aug 13, 2026',
    member: 'Me',
    notes: '',
    enabled: true,
  },
];
