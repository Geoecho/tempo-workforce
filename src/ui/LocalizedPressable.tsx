import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable as NativePressable, PressableProps, StyleSheet } from 'react-native';
import { useLanguage } from '../lib/i18n';

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);
export function Pressable({ accessibilityLabel, accessibilityHint, style, onPressIn, onPressOut, disabled, ...props }: PressableProps) {
  const { t } = useLanguage();
  const [pressed, setPressed] = useState(false);
  const [motion] = useState(() => new Animated.Value(1));
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; listener.remove(); motion.stopAnimation(); };
  }, [motion]);
  const animate = (down: boolean) => {
    setPressed(down);
    Animated.timing(motion, { toValue: down && !reduced ? .72 : 1, duration: reduced ? 0 : down ? 90 : 170, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  const base = StyleSheet.flatten(resolved);
  return <AnimatedPressable {...props} disabled={disabled} style={[resolved, { opacity: Animated.multiply(motion, typeof base?.opacity === 'number' ? base.opacity : 1) }]} onPressIn={event => { animate(true); onPressIn?.(event); }} onPressOut={event => { animate(false); onPressOut?.(event); }} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined} accessibilityHint={accessibilityHint ? t(accessibilityHint) : undefined} />;
}
