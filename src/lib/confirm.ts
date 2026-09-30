import { Alert, Platform } from 'react-native';
import { translateUi } from './i18n';

export function confirmRemoval(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${translateUi(title)}\n\n${translateUi(message)}`)) onConfirm();
    return;
  }
  Alert.alert(translateUi(title), translateUi(message), [
    { text: translateUi('Cancel'), style: 'cancel' },
    { text: translateUi('Remove'), style: 'destructive', onPress: onConfirm },
  ]);
}
