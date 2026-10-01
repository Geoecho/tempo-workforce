import React from 'react';
import { Platform, Text as NativeText, TextInput as NativeTextInput, TextInputProps, TextProps } from 'react-native';
import { useLanguage } from '../lib/i18n';
import { useTheme } from './theme';

function translateChildren(children: React.ReactNode, translate: (value: string) => string): React.ReactNode {
  return React.Children.map(children, child => typeof child === 'string' ? translate(child) : child);
}

const brandFont = { fontFamily: Platform.OS === 'web' ? 'Arial' : undefined };

export function Text({ children, style, ...props }: TextProps) {
  const { t } = useLanguage();
  const C = useTheme().colors;
  return <NativeText {...props} style={[brandFont, { color: C.ink }, style]}>{translateChildren(children, t)}</NativeText>;
}

export function TextInput({ placeholder, accessibilityLabel, placeholderTextColor, selectionColor, style, ...props }: TextInputProps) {
  const { t } = useLanguage();
  const { colors: C, scheme } = useTheme();
  return <NativeTextInput {...props} keyboardAppearance={scheme} style={[brandFont, { color: C.ink }, style]} placeholderTextColor={placeholderTextColor ?? C.placeholder} selectionColor={selectionColor ?? C.green} placeholder={placeholder ? t(placeholder) : undefined} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined} />;
}
