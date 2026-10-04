import { ArrowRight, Bell, CalendarClock, History, PanelLeftClose, PanelLeftOpen, QrCode } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type AppIconName = 'home' | 'calendar' | 'upcoming' | 'history' | 'panel-open' | 'panel-close' | 'team' | 'time' | 'settings' | 'scan' | 'bell' | 'arrow-right';
type Props = { name: AppIconName; size?: number; color?: string; playing?: boolean };
const svgProps = { fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 };
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function DrawPath({ d, length, progress }: { d: string; length: number; progress: Animated.Value }) {
  return <AnimatedPath 
    d={d} 
    strokeDasharray={length} 
    strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [length, 0] })}
    opacity={progress.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 1, 1] })}
  />;
}

function CalendarDot({ cx, cy, index, color, progress }: { cx: number; cy: number; index: number; color: string; progress: Animated.Value }) {
  const windowStart = index * 0.11;
  const windowMid   = windowStart + 0.11;
  const windowEnd   = windowStart + 0.22;
  return <AnimatedCircle 
    cx={cx} cy={cy} r={1} fill={color} stroke="none" 
    opacity={progress.interpolate({ 
      inputRange: [0, windowStart, windowMid, Math.min(windowEnd, 0.99), 1], 
      outputRange: [1, 1, 0.3, 1, 1], 
      extrapolate: 'clamp' 
    })} 
  />;
}

export function AppIcon({ name, size = 20, color = '#254E3D', playing = false }: Props) {
  const [progress] = useState(() => new Animated.Value(name === 'settings' ? 0 : 1));
  const [reduced, setReduced] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => setReduced(value));
    mountedRef.current = true;
    return () => { live = false; listener.remove(); };
  }, []);

  useEffect(() => {
    progress.stopAnimation();
    if (reduced) { progress.setValue(name === 'settings' ? 0 : 1); return; }

    if (playing) {
      if (name === 'settings') {
        Animated.spring(progress, { toValue: 1, friction: 5, tension: 50, useNativeDriver: Platform.OS !== 'web' }).start();
      } else if (name === 'bell') {
        progress.setValue(0);
        Animated.timing(progress, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }).start();
      } else if (name === 'team' || name === 'arrow-right') {
        progress.setValue(0);
        Animated.spring(progress, { toValue: 1, friction: 5, tension: 200, useNativeDriver: Platform.OS !== 'web' }).start();
      } else {
        progress.setValue(0);
        Animated.timing(progress, { toValue: 1, duration: name === 'calendar' ? 700 : 500, useNativeDriver: false }).start();
      }
    } else {
      if (name === 'settings') {
        Animated.spring(progress, { toValue: 0, friction: 5, tension: 50, useNativeDriver: Platform.OS !== 'web' }).start();
      } else {
        progress.setValue(1);
      }
    }
  }, [playing, name, reduced, progress]);

  const svg = (children: React.ReactNode) => <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...svgProps}>{children}</Svg>;

  if (name === 'upcoming' || name === 'history' || name === 'panel-open' || name === 'panel-close') {
    const Icon = name === 'upcoming' ? CalendarClock : name === 'history' ? History : name === 'panel-open' ? PanelLeftOpen : PanelLeftClose;
    return <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: name === 'history' ? ['-35deg', '0deg'] : ['0deg', '0deg'] }) }, { translateX: progress.interpolate({ inputRange: [0, .5, 1], outputRange: name.startsWith('panel') ? [0, 3, 0] : [0, 0, 0] }) }] }}><Icon size={size} color={color} /></Animated.View>;
  }
  if (name === 'home') return svg(<>
    <Path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <DrawPath d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" length={24} progress={progress} />
  </>);

  if (name === 'calendar') return svg(<>
    <Path d="M8 2v4M16 2v4M3 10h18" />
    <Rect x={3} y={4} width={18} height={18} rx={2} />
    {[8, 12, 16].flatMap((cx, column) =>
      [14, 18].map((cy, row) =>
        <CalendarDot key={`${cx}-${cy}`} cx={cx} cy={cy} index={column * 2 + row} color={color} progress={progress} />
      )
    )}
  </>);

  if (name === 'team') return <View style={{ width: size, height: size }}>
    {svg(<>
      <Path d="M18 21a8 8 0 0 0-16 0" />
      <Circle cx={10} cy={8} r={5} />
    </>)}
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, {
      opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.4, 1], extrapolate: 'clamp' }),
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-4, 0], extrapolate: 'clamp' }) }]
    }]}>
      {svg(<Path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />)}
    </Animated.View>
  </View>;

  if (name === 'time') return svg(<>
    <Path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <DrawPath d="m7 13 3-3 4 4 5-5" length={24} progress={progress} />
  </>);

  if (name === 'settings') return <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
    {svg(<>
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <Circle cx={12} cy={12} r={3} />
    </>)}
  </Animated.View>;

  if (name === 'scan') return <Animated.View style={{ transform: [{ scale: progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1.14, 1], extrapolate: 'clamp' }) }] }}><QrCode size={size} color={color} /></Animated.View>;
  if (name === 'bell') return <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-10deg', '10deg', '-10deg', '0deg'], extrapolate: 'clamp' }) }] }}><Bell size={size} color={color} /></Animated.View>;
  return <Animated.View style={{
    opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 1], extrapolate: 'clamp' }),
    transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-3, 0], extrapolate: 'clamp' }) }]
  }}><ArrowRight size={size} color={color} /></Animated.View>;
}
