import { ArrowRight, Bell, QrCode } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type AppIconName = 'home' | 'calendar' | 'team' | 'time' | 'settings' | 'scan' | 'bell' | 'arrow-right';
type Props = { name: AppIconName; size?: number; color?: string; playing?: boolean };
const svgProps = { fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 };

// Native drawings follow the motion layers in the Lucide Animated icons used on web.
export function AppIcon({ name, size = 20, color = '#164B3B', playing = false }: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!playing) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!alive || reduced) return;
      progress.stopAnimation();
      progress.setValue(0);
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }).catch(() => {});
    return () => { alive = false; progress.stopAnimation(); progress.setValue(0); };
  }, [playing, progress]);
  const svg = (children: React.ReactNode) => <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...svgProps}>{children}</Svg>;
  const overlay = (children: React.ReactNode, axis?: 'x' | 'y', distance = -3) => <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, .32] }) }, axis === 'x' ? { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, distance] }) }] } : axis === 'y' ? { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, distance] }) }] } : null]}>{svg(children)}</Animated.View>;
  if (name === 'home') return <View style={{ width: size, height: size }}>
    {svg(<Path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />)}
    {overlay(<Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />, 'y')}
  </View>;
  if (name === 'calendar') return <View style={{ width: size, height: size }}>
    {svg(<><Path d="M8 2v4M16 2v4M3 10h18" /><Rect x={3} y={4} width={18} height={18} rx={2} /></>)}
    {overlay(<>{[8, 12, 16].flatMap(cx => [14, 18].map(cy => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1} fill={color} stroke="none" />))}</>)}
  </View>;
  if (name === 'team') return <View style={{ width: size, height: size }}>
    {svg(<><Path d="M18 21a8 8 0 0 0-16 0" /><Circle cx={10} cy={8} r={5} /></>)}
    {overlay(<Path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />, 'x', -2)}
  </View>;
  if (name === 'time') return <View style={{ width: size, height: size }}>
    {svg(<Path d="M3 3v16a2 2 0 0 0 2 2h16" />)}
    {overlay(<Path d="m7 13 3-3 4 4 5-5" />, 'y', 3)}
  </View>;
  if (name === 'settings') return <Animated.View style={{ width: size, height: size, transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '35deg'] }) }] }}>{svg(<><Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><Circle cx={12} cy={12} r={3} /></>)}</Animated.View>;
  if (name === 'scan') return <Animated.View style={{ transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }}><QrCode size={size} color={color} /></Animated.View>;
  const Icon = name === 'bell' ? Bell : ArrowRight;
  return <Animated.View style={{ transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, name === 'bell' ? 0 : 3] }) }] }}><Icon size={size} color={color} /></Animated.View>;
}
