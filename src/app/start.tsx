import { Redirect } from 'expo-router';
import { StoreProvider } from '../lib/store';

// Keep authentication inside a screen so the public navigator stays mounted.
export default function Start() {
  return <StoreProvider><Redirect href="/" /></StoreProvider>;
}
