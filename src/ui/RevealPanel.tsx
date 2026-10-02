import React, { useEffect } from 'react';
import { AccessibilityInfo, Animated, Platform } from 'react-native';
export function RevealPanel({ children }: { children: React.ReactNode }) {
  const [progress] = React.useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 180, useNativeDriver: Platform.OS !== 'web' }).start();
    }).catch(() => progress.setValue(1));
    return () => { active = false; progress.stopAnimation(); };
  }, [progress]);
  return <Animated.View style={{ flexShrink: 0, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }}>{children}</Animated.View>;
}
