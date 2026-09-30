import React from 'react';
import { Pressable as NativePressable, PressableProps } from 'react-native';
import { useLanguage } from '../lib/i18n';

export function Pressable({ accessibilityLabel, accessibilityHint, ...props }: PressableProps) {
  const { t } = useLanguage();
  return <NativePressable {...props} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined} accessibilityHint={accessibilityHint ? t(accessibilityHint) : undefined} />;
}
