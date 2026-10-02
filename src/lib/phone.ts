import { Linking } from 'react-native';

export async function callWorker(phone?: string): Promise<boolean> {
  const clean = phone?.replace(/[^+\d]/g, '') ?? '';
  if (clean.replace(/\D/g, '').length < 7) return false;
  try { await Linking.openURL(`tel:${clean}`); return true; } catch { return false; }
}

export async function messageWorker(phone?: string): Promise<boolean> {
  const clean = phone?.replace(/[^+\d]/g, '') ?? '';
  if (clean.replace(/\D/g, '').length < 7) return false;
  try { await Linking.openURL(`sms:${clean}`); return true; } catch { return false; }
}
