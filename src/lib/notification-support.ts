import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const notificationsSupported = Platform.OS !== 'web' && !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);
