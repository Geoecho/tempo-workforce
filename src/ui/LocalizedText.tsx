import React, { useState } from 'react';
import { Platform, StyleSheet, Text as NativeText, TextInput as NativeTextInput, TextInputProps, TextProps } from 'react-native';
import { InputFocusRing } from './InputFocusRing';
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

export function TextInput({ placeholder, accessibilityLabel, placeholderTextColor, selectionColor, style, animatedBorder = true, ...props }: TextInputProps & { animatedBorder?: boolean }) {
  const { t } = useLanguage();
  const { colors: C, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(props.defaultValue ?? '');
  const filled = Boolean(props.value ?? uncontrolledValue);
  const flat = StyleSheet.flatten(style) ?? {};
  const { margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, flex, flexGrow, flexShrink, flexBasis, alignSelf, width, maxWidth, minWidth, ...inputStyle } = flat;
  const input = <NativeTextInput {...props} onChangeText={value => { setUncontrolledValue(value); props.onChangeText?.(value); }} underlineColorAndroid="transparent" onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} keyboardAppearance={scheme} style={[brandFont, { color: C.ink }, animatedBorder ? inputStyle : style, animatedBorder && filled && { backgroundColor: C.mint }, Platform.OS === 'web' && { outlineStyle: 'none', '--tempo-input-fill': C.mint, '--tempo-input-ink': C.ink } as never]} placeholderTextColor={placeholderTextColor ?? C.placeholder} selectionColor={selectionColor ?? C.green} placeholder={placeholder ? t(placeholder) : undefined} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined} />;
  return animatedBorder ? <InputFocusRing active={focused && props.editable !== false} style={{ margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, flex, flexGrow, flexShrink, flexBasis, alignSelf, width, maxWidth, minWidth, borderRadius: flat.borderRadius ?? 8 }}>{input}</InputFocusRing> : input;
}
