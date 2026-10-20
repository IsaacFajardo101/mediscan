/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#173A36',
    tint: '#183D38',

    // Core surfaces
    background: '#F4F7F6',
    foreground: '#173A36',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#173A36',

    // Primary action color (buttons, links, active states)
    primary: '#183D38',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EAF1EE',
    secondaryForeground: '#24443F',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EDF2F0',
    mutedForeground: '#71817D',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#DCEFE5',
    accentForeground: '#173A36',

    // Destructive actions (delete, error states)
    destructive: '#CE3D39',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#DCE4E1',
    input: '#DCE4E1',

    // Dashboard status colors used by reminder summary cards.
    expiredBackground: '#F5DADD',
    expiredBorder: '#CD858A',
    expiredForeground: '#9F404A',
    expiringBackground: '#F6E5D4',
    expiringBorder: '#D6A777',
    expiringForeground: '#9A653A',
    todayBackground: '#DDEBE0',
    todayBorder: '#9ABDA4',
    todayForeground: '#3F7851',
    totalBackground: '#D9EEF7',
    totalBorder: '#91C5D9',
    totalForeground: '#367F9C',
    overlay: 'rgba(12, 35, 32, 0.42)',
    overlayStrong: 'rgba(12, 35, 32, 0.55)',
    addRing: '#D9E9E2',
    confirmBackground: '#FBE9E9',
    shadow: '#163A36',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
