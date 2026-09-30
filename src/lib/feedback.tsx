import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { requestReminderPermission } from './reminder-permission';

type Cue = 'select' | 'confirm' | 'decline';
type Preferences = { haptics: boolean; sounds: boolean; reminders: boolean };
type Feedback = Preferences & {
  ready: boolean;
  play: (cue: Cue) => void;
  setHaptics: (enabled: boolean) => void;
  setSounds: (enabled: boolean) => void;
  setReminders: (enabled: boolean) => Promise<boolean>;
};
const KEY = 'tempo:feedback:v1';
const defaults: Preferences = { haptics: true, sounds: false, reminders: false };
const Context = createContext<Feedback | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  const confirmPlayer = useAudioPlayer(require('../../assets/sounds/confirm.wav'));
  const declinePlayer = useAudioPlayer(require('../../assets/sounds/decline.wav'));

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) setPreferences({ ...defaults, ...JSON.parse(raw) });
    }).catch(() => {}).finally(() => setReady(true));
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);
  useEffect(() => {
    if (ready) void AsyncStorage.setItem(KEY, JSON.stringify(preferences)).catch(() => {});
  }, [preferences, ready]);
  const play = useCallback((cue: Cue) => {
    if (preferences.haptics && Platform.OS !== 'web') {
      const action = cue === 'select'
        ? Haptics.selectionAsync()
        : Haptics.notificationAsync(cue === 'confirm' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      void action.catch(() => {});
    }
    if (preferences.sounds && cue !== 'select') {
      const player = cue === 'confirm' ? confirmPlayer : declinePlayer;
      void player.seekTo(0).then(() => player.play()).catch(() => {});
    }
  }, [preferences.haptics, preferences.sounds, confirmPlayer, declinePlayer]);
  const setReminders = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const allowed = await requestReminderPermission().catch(() => false);
      if (!allowed) return false;
    }
    setPreferences(current => ({ ...current, reminders: enabled }));
    return true;
  }, []);

  return <Context.Provider value={{ ...preferences, ready, play, setHaptics: enabled => setPreferences(current => ({ ...current, haptics: enabled })), setSounds: enabled => setPreferences(current => ({ ...current, sounds: enabled })), setReminders }}>{children}</Context.Provider>;
}

export function useFeedback(): Feedback {
  const value = useContext(Context);
  if (!value) throw new Error('FeedbackProvider is missing');
  return value;
}
