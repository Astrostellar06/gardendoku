import type { CapacitorConfig } from '@capacitor/cli';

/** Native iOS / Android apps: the Vite build (dist/) runs in the system web view. */
const config: CapacitorConfig = {
  appId: 'io.github.astrostellar06.gardendoku',
  appName: 'Gardendoku',
  webDir: 'dist',
  backgroundColor: '#FFD6E5',
  plugins: {
    SystemBars: {
      // The page already pads itself with env(safe-area-inset-*) (viewport-fit=cover).
      initialViewportFitValueHint: 'cover',
      // Dark icons: the garden's background is always light.
      style: 'LIGHT',
    },
  },
};

export default config;
