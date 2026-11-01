import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Reminders icon from the Figma design
// this is basically the reminder icon lang
export default function ReminderIcon({ size = 24, color = '#000' }: { size?: number; color?: any }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* solid arc + arrow head */}
      <Path
        d="M9.26 19.52 A8 8 0 1 1 18.13 6.86"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M19.05 4.44 L18.77 7.63 L15.58 7.35"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* dashed part of the circle */}
      <Path
        d="M19.73 9.93 A8 8 0 0 1 13.39 19.88"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeDasharray="2.4 2.4"
      />
      {/* clock hands */}
      <Path
        d="M12 8.5 V12 L14.6 13.6"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}