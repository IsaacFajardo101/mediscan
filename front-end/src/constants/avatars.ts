export const AVATAR_MAP: Record<number, any> = {
  1: require('../../assets/avatars/avatar_1.png'),
  2: require('../../assets/avatars/avatar_2.png'),
  3: require('../../assets/avatars/avatar_3.png'),
  4: require('../../assets/avatars/avatar_4.png'),
  5: require('../../assets/avatars/avatar_5.png'),
  6: require('../../assets/avatars/avatar_6.png'),
  7: require('../../assets/avatars/avatar_7.png'),
  8: require('../../assets/avatars/avatar_8.png'),
  9: require('../../assets/avatars/avatar_9.png'),
  10: require('../../assets/avatars/avatar_10.png'),
  11: require('../../assets/avatars/avatar_11.png'),
  12: require('../../assets/avatars/avatar_12.png'),
};

export const AVATARS = [
  { id: 1, image: AVATAR_MAP[1] },
  { id: 2, image: AVATAR_MAP[2] },
  { id: 3, image: AVATAR_MAP[3] },
  { id: 4, image: AVATAR_MAP[4] },
  { id: 5, image: AVATAR_MAP[5] },
  { id: 6, image: AVATAR_MAP[6] },
  { id: 7, image: AVATAR_MAP[7] },
  { id: 8, image: AVATAR_MAP[8] },
  { id: 9, image: AVATAR_MAP[9] },
  { id: 10, image: AVATAR_MAP[10] },
  { id: 11, image: AVATAR_MAP[11] },
  { id: 12, image: AVATAR_MAP[12] },
];

export const getAvatarSource = (iconId?: number) => {
  const safeId = iconId && iconId >= 1 && iconId <= 12 ? iconId : 1;
  return AVATAR_MAP[safeId];
};

export function getAvatar(iconId: number = 1) {
  return {
    bg: '#D8F3DC',
    emoji: '👤',
  };
}

export default getAvatar;