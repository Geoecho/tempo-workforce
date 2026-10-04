// Pure language state shared by formatting utilities and the React provider.
export type Language = 'en-US' | 'mk-MK' | 'sq-AL';
let current: Language = 'en-US';
export const getCurrentLanguage = () => current;
export const setActiveLanguage = (language: Language) => { current = language; };
