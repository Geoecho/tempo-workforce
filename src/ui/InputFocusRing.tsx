import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, ViewProps } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useReducedMotion } from './AuthMotion';
import { useTheme } from './theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** A crisp travelling highlight; only the border moves, never the input text. */
export function InputFocusRing({ active, children, style, ...props }: ViewProps & { active: boolean }) {
  const C = useTheme().colors;
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const radius = Number(StyleSheet.flatten(style)?.borderRadius ?? 12);
  const border = Number(StyleSheet.flatten(style)?.borderWidth ?? 0);
  const r = Math.max(0, Math.min(radius, size.width / 2, size.height / 2) + 3);
  const perimeter = Math.max(1, 2 * (size.width + size.height + 12) - (8 - 2 * Math.PI) * r);
  useEffect(() => {
    progress.setValue(0);
    if (!active || reduced || Platform.OS === 'web') return;
    const motion = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 6500, easing: Easing.linear, useNativeDriver: false, isInteraction: false }));
    motion.start();
    return () => motion.stop();
  }, [active, reduced, progress]);
  return <View {...props} style={style} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setSize(current => current.width === width && current.height === height ? current : { width, height });
    props.onLayout?.(event);
  }}>
    {children}
    {active && size.width > 2 && size.height > 2 && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: -border - 4, left: -border - 4, width: size.width + 8, height: size.height + 8 }}>
      <Svg width={size.width + 8} height={size.height + 8}>
        <Rect x={1} y={1} width={size.width + 6} height={size.height + 6} rx={r} fill="none" stroke={C.green} strokeOpacity={0.35} strokeWidth={1.5} />
        {!reduced && (Platform.OS === 'web' ? <rect x={1} y={1} width={size.width + 6} height={size.height + 6} rx={r} fill="none" stroke={C.green} strokeWidth={2} strokeLinecap="round" strokeDasharray={`${perimeter * 0.18} ${perimeter * 0.82}`}>
          {React.createElement('animate', { attributeName: 'stroke-dashoffset', from: 0, to: -perimeter, dur: '6.5s', repeatCount: 'indefinite' })}
        </rect> : <AnimatedRect x={1} y={1} width={size.width + 6} height={size.height + 6} rx={r} fill="none" stroke={C.green} strokeWidth={2} strokeLinecap="round" strokeDasharray={[perimeter * 0.18, perimeter * 0.82]} strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [0, -perimeter] })} />)}
      </Svg>
    </View>}
  </View>;
}
