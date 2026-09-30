import React from 'react';
import { Text as NativeText, TextInput as NativeTextInput, TextInputProps, TextProps } from 'react-native';
import { useLanguage } from '../lib/i18n';

function translateChildren(children: React.ReactNode, translate: (value: string) => string): React.ReactNode {
  return React.Children.map(children, child => typeof child === 'string' ? translate(child) : child);
}

export function Text({ children, ...props }: TextProps) {
  const { t } = useLanguage();
  return <NativeText {...props}>{translateChildren(children, t)}</NativeText>;
}

export function TextInput({ placeholder, accessibilityLabel, ...props }: TextInputProps) {
  const { t } = useLanguage();
  return <NativeTextInput {...props} placeholder={placeholder ? t(placeholder) : undefined} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined} />;
}
