import 'expo-modules-core';

declare module 'expo-modules-core' {
  // The watch bridge names this SDK 57 type by its pre-SDK-57 alias.
  export type Subscription = EventSubscription;
}
