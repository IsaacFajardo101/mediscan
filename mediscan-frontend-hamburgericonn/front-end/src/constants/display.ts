// Ito yung constants file para sa colors, typography, spacing, at iba pang display-related na constants.
// In Sprint 3, Display only edits THIS file.

// This is the COLOR TOKEN na nasa figma.
const lightTokens = {
  textPrimary: '#051F20',      // primary text, dark headers, tooltips, dark modals
  actionPrimary: '#183732',    // primary buttons, center floating button
  textSecondary: '#245248',    // body text, labels, timestamps, category tags
  borderDefault: '#85AD95',    // divider lines, card borders, input outlines
  surfaceSecondary: '#DBF0DF', // cards, containers, modals, input backgrounds
  surfacePrimary: '#F8FAFC',   // main background of the whole screen
  statusSuccess: '#2E7D32',    // verified, safe to take, active reminders
  statusWarning: '#B25E09',    // needs review, expiring soon
  statusDanger: '#C62828',     // expired, DO NOT TAKE, errors, delete
  onAction: '#FFFFFF',         // text/icon color on top of buttons (light mode)
  // Soft backgrounds for status badges
  statusSuccessSoft: '#DBF0DF',
  statusWarningSoft: '#FDEBD3',
  statusDangerSoft: '#FBE1E1',
};

//Proposed dark mode
const darkTokens = {
  textPrimary: '#E8F5EC',
  actionPrimary: '#7CC4A8',
  textSecondary: '#A9CDB8',
  borderDefault: '#3F6B5B',
  surfaceSecondary: '#12302B',
  surfacePrimary: '#0A1514',
  statusSuccess: '#66BB6A',
  statusWarning: '#F2A65A',
  statusDanger: '#EF6B6B',
  onAction: '#051F20',
  statusSuccessSoft: '#1B3D2E',
  statusWarningSoft: '#3D2A14',
  statusDangerSoft: '#3D1B1B',
};

type Tokens = typeof lightTokens;

const buildColors = (t: Tokens) => ({
  // Guide names
  ...t,

  // Short names used by the navigation shell
  text: t.textPrimary,
  textMuted: t.textSecondary,
  primary: t.actionPrimary,
  primarySoft: t.surfaceSecondary,
  background: t.surfacePrimary,
  surface: t.surfacePrimary,
  border: t.borderDefault,
  active: t.statusSuccess,     // active tab color
  inactive: t.textSecondary,
  danger: t.statusDanger,
  warning: t.statusWarning,
  success: t.statusSuccess,
});

// Colors = light mode (used by the whole app). DarkColors = proposed dark mode.
export const Colors = buildColors(lightTokens);
export const DarkColors = buildColors(darkTokens);

// Ito naman yung typography constants na ginagamit sa app.
// Use like:  <Text style={Type.h1}>...</Text>
export const Type = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  h1: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  h3: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  bodyLarge: { fontSize: 18, lineHeight: 28, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' }, // hard floor: never go below 16 for body
  label: { fontSize: 16, lineHeight: 20, fontWeight: '600' }, // labels and buttons
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '500' }, // metadata only
} as const;

export const Fonts = {
  // Dito naman sa future kung gusto natin mag-add ng custom fonts. For now, we just use the system font.
  // Also here are the font weights. If we want to use custom fonts, we can add them here and use them in the Type object above.
  regular: undefined as string | undefined,
  bold: undefined as string | undefined,
};

// Older size names used by the navigation shell (mapped to the guide's scale)
export const FontSizes = { title: 22, heading: 18, body: 16, small: 14 };

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const Radius = { sm: 8, md: 14, lg: 24, pill: 999 };

// Ito yung mga reusable components na ginagamit sa buong app. For example, buttons, cards, input fields, etc.
export const makeComponents = (c: ReturnType<typeof buildColors>) => ({
  // Primary green action button
  buttonPrimary: {
    backgroundColor: c.statusSuccess,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonPrimaryText: { ...Type.label, color: c.onAction },

  // Outlined button
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.borderDefault,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonSecondaryText: { ...Type.label, color: c.textPrimary },

  // Danger button (delete, DO NOT TAKE actions)
  buttonDanger: {
    backgroundColor: c.statusDanger,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Center floating camera button in the tab bar
  fabCamera: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: c.actionPrimary,
    borderWidth: 4,
    borderColor: c.surfaceSecondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Search bar
  searchInput: {
    backgroundColor: c.surfacePrimary,
    borderWidth: 1,
    borderColor: c.textSecondary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Type.body,
    color: c.textPrimary,
  },

  // General text input
  input: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.borderDefault,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Type.body,
    color: c.textPrimary,
  },

  // Filter chips (All / Verified / Needs Verification / Expired)
  chip: {
    borderWidth: 1,
    borderColor: c.borderDefault,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: c.surfacePrimary,
  },
  chipSelected: {
    borderWidth: 1,
    borderColor: c.actionPrimary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: c.actionPrimary,
  },

  // Status badges (Verified / Needs Verification / Expired)
  badgeVerified: {
    backgroundColor: c.statusSuccessSoft,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  badgeWarning: {
    backgroundColor: c.statusWarningSoft,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  badgeDanger: {
    backgroundColor: c.statusDangerSoft,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },

  // Generic card (modals, containers)
  card: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.borderDefault,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },

  // Medicine list item (Vault)
  medicineCard: {
    backgroundColor: c.surfacePrimary,
    borderWidth: 1,
    borderColor: c.borderDefault,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },

  // Recent scan card (Home), tinted green
  scanCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },

  // Overview stat card (12 Total / 8 Verified / ...)
  statCard: {
    backgroundColor: c.surfacePrimary,
    borderWidth: 1,
    borderColor: c.borderDefault,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center' as const,
  },

  // Quick action tile (Add Medicine / Export List / Backup Vault)
  quickAction: {
    backgroundColor: c.surfacePrimary,
    borderWidth: 1,
    borderColor: c.textSecondary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center' as const,
  },
});

export const Components = makeComponents(Colors);
export const DarkComponents = makeComponents(DarkColors);

export const Theme = { Colors, DarkColors, Type, Fonts, FontSizes, Spacing, Radius, Components };
export default Theme;