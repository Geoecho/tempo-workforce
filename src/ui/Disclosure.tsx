import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useReducedMotion } from './AuthMotion';

// Keep the content mounted through closing so both directions animate smoothly.
export function Disclosure({ open, children }: { open: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [measured, setMeasured] = useState(0);
  const [height] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(height, { toValue: open ? measured : 0, duration: reduced ? 0 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [open, measured, height, reduced]);
  return <Animated.View pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} aria-hidden={!open} style={{ height, overflow: 'hidden', width: '100%' }}>
    <View onLayout={event => setMeasured(event.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{children}</View>
  </Animated.View>;
}
