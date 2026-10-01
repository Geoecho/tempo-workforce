import React from 'react';
import { View } from 'react-native';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export function BrandMark({ size = 29, color }: { size?: number; color?: string }) {
  const C = useTheme().colors;
  const markColor = color ?? C.green;
  const scale = size / 29;
  return <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 * scale, transform: [{ rotate: '-22deg' }] }}>
    {[16, 28, 21].map((height, index) => <View key={index} style={{ width: 6 * scale, height: height * scale, borderRadius: 4 * scale, backgroundColor: markColor }} />)}
  </View></View>;
}

export function BrandLogo({ size = 27, color }: { size?: number; color?: string }) {
  const C = useTheme().colors;
  const logoColor = color ?? C.ink;
  return <View accessibilityLabel="Tempo" style={{ flexDirection: 'row', alignItems: 'center', gap: size * .32 }}><BrandMark size={size} color={logoColor} /><Text style={{ color: logoColor, fontSize: size, letterSpacing: -size * .055, fontWeight: '600' }}>tempo</Text></View>;
}
