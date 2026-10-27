export const Assets = {
  logo: {
    icon: require('../../assets/images/logo/mediscan-icon.png'),
    iconLight: require('../../assets/images/logo/mediscan-icon-transparent.png'), // for dark backgrounds
    // ito yung logo na may text, used in the side menu and other places.
  },
  profile: {
    // for default profile picture, used in the profile tab and other places.
  },
  // Sample medicine photos (placeholders until real scans come from the backend)
  meds: {
    decolgen: require('../../assets/images/meds/decolgen.heic'),
    // Placeholder photos for the "Possible Matches" list
    match1: require('../../assets/images/meds/match-1.png'),
    match2: require('../../assets/images/meds/match-2.png'),
    match3: require('../../assets/images/meds/match-3.png'),
    match4: require('../../assets/images/meds/match-4.png'),
  },
  icons: {
    // Scan Result screen
    verified: require('../../assets/images/result/verified.svg'),
    manufacturer: require('../../assets/images/result/manufacturer.svg'),
    expiryDate: require('../../assets/images/result/expiry-date.svg'),
    batchNumber: require('../../assets/images/result/batch-number.svg'),
    medicineType: require('../../assets/images/result/medicine-type.svg'),
    strength: require('../../assets/images/result/strength.svg'),
    details: require('../../assets/images/result/details.svg'),
    save: require('../../assets/images/result/save.svg'),
    warningAmber: require('../../assets/images/result/warning-amber.svg'),
    warningRed: require('../../assets/images/result/warning-red.svg'),
    scanWhite: require('../../assets/images/result/scan-white.svg'),
    scanRed: require('../../assets/images/result/scan-red.svg'),
    checkSelected: require('../../assets/images/result/check-selected.svg'),
    edit: require('../../assets/images/result/edit.svg'),
    saveWhite: require('../../assets/images/result/save-white.svg'),
    scanAmber: require('../../assets/images/result/scan-amber.svg'),
    // Edit Medicine screen
    chevronDown: require('../../assets/images/edit-medicine/chevron-down.svg'),
    // Manual Entry screen
    search: require('../../assets/images/manual-entry/search.svg'),
    calendar: require('../../assets/images/manual-entry/calendar.svg'),
    lock: require('../../assets/images/manual-entry/lock.svg'),
    lockSmall: require('../../assets/images/manual-entry/lock-small.svg'),
    bookmark: require('../../assets/images/manual-entry/bookmark.svg'),
  },
};

export default Assets;
