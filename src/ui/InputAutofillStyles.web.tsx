import React from 'react';
import { useTheme } from './theme';

export function InputAutofillStyles() {
  const { colors: C, scheme } = useTheme();
  return <style>{`
    input, textarea { color-scheme: ${scheme}; }
    input:-webkit-autofill, input[id]:-webkit-autofill,
    textarea:-webkit-autofill, textarea[id]:-webkit-autofill {
      box-shadow: inset 0 0 0 1000px ${C.mint} !important;
      -webkit-box-shadow: inset 0 0 0 1000px ${C.mint} !important;
      -webkit-text-fill-color: ${C.ink} !important;
      caret-color: ${C.ink} !important;
    }
    input:autofill, textarea:autofill {
      box-shadow: inset 0 0 0 1000px ${C.mint} !important;
      color: ${C.ink} !important;
    }
  `}</style>;
}
