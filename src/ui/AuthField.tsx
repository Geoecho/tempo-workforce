import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { TextInputProps } from 'react-native';
import { InputFocusRing } from './InputFocusRing';
import { Pressable } from './LocalizedPressable';
import { TextInput } from './LocalizedText';
import { useTheme } from './theme';
import { useAuthStyles } from './AuthLayout';

export function AuthField({ password = false, ...props }: TextInputProps & { password?: boolean }) {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <InputFocusRing active={focused} style={[s.password, Boolean(props.value ?? props.defaultValue) && { backgroundColor: C.mint }]}>
    <TextInput {...props} animatedBorder={false} nativeID={`tempo-auth-${props.accessibilityLabel?.toLowerCase().replace(/\s/g, '-') ?? 'field'}`} secureTextEntry={password ? !visible : props.secureTextEntry} underlineColorAndroid="transparent" onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} style={[s.passwordInput, { minWidth: 0, borderRadius: 12 }, props.style]} />
    {password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} accessibilityState={{ checked: visible }} onPress={() => setVisible(value => !value)} style={s.eye}>{visible ? <EyeOff size={18} color={C.green} /> : <Eye size={18} color={C.muted} />}</Pressable>}
  </InputFocusRing>;
}
