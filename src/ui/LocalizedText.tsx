import React from 'react';
import { Platform, Text as NativeText, TextInput as NativeTextInput, TextInputProps, TextProps } from 'react-native';
import { useLanguage } from '../lib/i18n';

function translateChildren(children: React.ReactNode, translate: (value: string) => string): React.ReactNode {
  return React.Children.map(children, child => typeof child === 'string' ? translate(child) : child);
}

const brandFont = { fontFamily: Platform.OS === 'web' ? 'Arial' : undefined };

export function Text({ children, style, ...props }: TextProps) {
  const { t } = useLanguage();
  return <NativeText {...props} style={[brandFont, style]}>{translateChildren(children, t)}</NativeText>;
}

export function TextInput({ placeholder, accessibilityLabel, style, ...props }: TextInputProps) {
  const { t } = useLanguage();
  return <NativeTextInput {...props} style={[brandFont, style]} placeholder={placeholder ? t(placeholder) : undefined} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined} />;
}
