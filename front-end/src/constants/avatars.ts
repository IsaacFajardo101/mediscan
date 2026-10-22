
export const AVATAR_MAP: Record<number, any> = {
  1: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_1' },
  2: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_2' },
  3: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_3' },
  4: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_4' },
  5: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_5' },
  6: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_6' },
  7: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_7' },
  8: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_8' },
  9: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_9' },
  10: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_10' },
  11: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_11' },
  12: { uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=avatar_12' },
};

export const getAvatarSource = (iconId?: number) => {
  const safeId = iconId && iconId >= 1 && iconId <= 12 ? iconId : 1;
  return AVATAR_MAP[safeId];
};