import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { MockAuth } from '../mock/mockAuth';
import { AddProfileRequest, EditProfileRequest, Profile } from '../types/profile';

// ONE source of truth for profiles. Data comes from MockAuth (the mock "backend").
// Every screen reads it from here, so an edit anywhere shows up everywhere.
// When the backend is ready, change MockAuth's functions, not this file.

const UNDO_SECONDS = 15;

interface ProfileContextType {
  email: string | null;
  profiles: Profile[]; // hides a profile that is waiting for its undo window / DELETE
  activeProfile: Profile | null; // the profile picked on "Choose your profile"
  setActiveProfile: (profile: Profile) => void;
  /** Throws an Error(message) if the save fails. */
  addProfile: (data: AddProfileRequest) => Promise<Profile>;
  /** Throws an Error(message) if the save fails. */
  updateProfile: (profileId: number, data: EditProfileRequest) => Promise<void>;
  deleteProfileWithUndo: (profileId: number) => void;
  undoDelete: () => void;
  pendingDeleteId: number | null;
  undoSecondsLeft: number;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useSyncExternalStore(MockAuth.subscribe, MockAuth.getSnapshot, MockAuth.getSnapshot);

  // ---- Delete with 15-second undo ----
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  // Hidden from lists: the pending one + any whose DELETE is still in flight (no flicker)
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const unhide = (id: number) => setHiddenIds((ids) => ids.filter((x) => x !== id));
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(UNDO_SECONDS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    timerRef.current = null;
    tickRef.current = null;
  };

  // Sends the DELETE for whatever is pending (timer ended, or another delete started)
  const commitPendingDelete = useCallback(() => {
    const id = pendingRef.current;
    clearTimers();
    pendingRef.current = null;
    setPendingDeleteId(null);
    if (id === null) return;
    MockAuth.deleteProfile(id).then((res) => {
      // On success it's gone from the store; on failure it simply shows up again
      if (!res.success) console.warn(`[Backend Sync] DELETE profile ${id} failed: ${res.message}`);
      unhide(id);
    });
  }, []);

  const deleteProfileWithUndo = useCallback(
    (profileId: number) => {
      if (store.activeProfile?.profile_id === profileId) return; // can't remove the profile in use
      // Only one undo at a time: finish the previous delete first so it isn't lost
      if (pendingRef.current !== null) commitPendingDelete();

      pendingRef.current = profileId;
      setPendingDeleteId(profileId);
      setHiddenIds((ids) => [...ids, profileId]);
      setUndoSecondsLeft(UNDO_SECONDS);

      tickRef.current = setInterval(() => {
        setUndoSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
      timerRef.current = setTimeout(commitPendingDelete, UNDO_SECONDS * 1000);
    },
    [store.activeProfile, commitPendingDelete]
  );

  const undoDelete = useCallback(() => {
    clearTimers();
    if (pendingRef.current !== null) unhide(pendingRef.current);
    pendingRef.current = null;
    setPendingDeleteId(null);
  }, []);

  // Logging out cancels a pending delete instead of sending it with no session
  useEffect(() => {
    if (!store.email) {
      undoDelete();
      setHiddenIds([]);
    }
  }, [store.email, undoDelete]);
  useEffect(() => clearTimers, []);

  // ---- Add / Edit ----
  const addProfile = useCallback(async (data: AddProfileRequest) => {
    const res = await MockAuth.addProfile(data);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }, []);

  const updateProfile = useCallback(async (profileId: number, data: EditProfileRequest) => {
    const res = await MockAuth.updateProfile(profileId, data);
    if (!res.success) throw new Error(res.message);
  }, []);

  const setActiveProfile = useCallback((profile: Profile) => MockAuth.selectProfile(profile), []);

  const profiles = useMemo(
    () => store.profiles.filter((p) => !hiddenIds.includes(p.profile_id)),
    [store.profiles, hiddenIds]
  );

  return (
    <ProfileContext.Provider
      value={{
        email: store.email,
        profiles,
        activeProfile: store.activeProfile,
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