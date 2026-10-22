import React, { createContext, useContext, useRef, useState } from 'react';
import { MOCK_FETCH_PROFILES } from '../data/mockProfiles';
import { AddProfileRequest, EditProfileRequest, Profile } from '../types/profile';

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  addProfile: (data: AddProfileRequest) => Promise<void>;
  updateProfile: (profileId: number, data: EditProfileRequest) => Promise<void>;
  deleteProfileWithUndo: (profileId: number) => void;
  undoDelete: () => void;
  pendingDeleteId: number | null;
  undoSecondsLeft: number;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_FETCH_PROFILES.data.profiles);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(MOCK_FETCH_PROFILES.data.profiles[0]);

  // Undo deletion state
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backupProfileRef = useRef<Profile | null>(null);

  // ADD PROFILE
  const addProfile = async (data: AddProfileRequest) => {
    const newProfile: Profile = {
      profile_id: Date.now(), // Simulates backend auto-increment ID
      ...data,
    };
    // Save locally
    setProfiles((prev) => [...prev, newProfile]);
    // In Sprint 4: Call POST /api/v1/accounts/me/profiles with payload
  };

  // UPDATE / EDIT PROFILE
  const updateProfile = async (profileId: number, data: EditProfileRequest) => {
    setProfiles((prev) =>
      prev.map((p) => (p.profile_id === profileId ? { ...p, ...data } : p))
    );
    if (activeProfile?.profile_id === profileId) {
      setActiveProfile((prev) => (prev ? { ...prev, ...data } : null));
    }
    // In Sprint 4: Call PUT /api/v1/accounts/me/profiles/{profileId}
  };

  // DELETE PROFILE WITH 15-SECOND UNDO
  const deleteProfileWithUndo = (profileId: number) => {
    const target = profiles.find((p) => p.profile_id === profileId);
    if (!target) return;

    backupProfileRef.current = target;
    setPendingDeleteId(profileId);
    setUndoSecondsLeft(15);

    // 1. Remove from local screen immediately
    setProfiles((prev) => prev.filter((p) => p.profile_id !== profileId));

    // 2. Countdown ticker for UI
    countdownIntervalRef.current = setInterval(() => {
      setUndoSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3. 15-second timeout to finalize delete
    timerRef.current = setTimeout(() => {
      console.log(`[Backend Sync] DELETE /api/v1/accounts/me/profiles/${profileId} confirmed.`);
      setPendingDeleteId(null);
      backupProfileRef.current = null;
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, 15000);
  };

  // UNDO DELETION
  const undoDelete = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (backupProfileRef.current) {
      setProfiles((prev) => [...prev, backupProfileRef.current!]);
      backupProfileRef.current = null;
    }
    setPendingDeleteId(null);
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfile,
        addProfile,
        updateProfile,
        deleteProfileWithUndo,
        undoDelete,
        pendingDeleteId,
        undoSecondsLeft,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
};