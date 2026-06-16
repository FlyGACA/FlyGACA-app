import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flygaca.app',
  appName: 'FlyGACA',
  // Vite builds the web payload into dist/; `cap sync` copies it into the
  // native shells. iOS is the primary platform (android/ is a scaffold).
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    // Native Apple/Google sign-in is wired through the native-bridge adapter;
    // the @capacitor-firebase/authentication plugin is added in the native shell.
  },
};

export default config;
