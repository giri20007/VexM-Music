import React from 'react';
import { AuthScreen } from './AuthScreen';

// Re-export for backward compatibility
export { AuthScreen };
export function TelegramAuthScreen() {
  return <AuthScreen />;
}
export default AuthScreen;
