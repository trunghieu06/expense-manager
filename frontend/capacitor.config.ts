import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expense.manager',
  appName: 'Expense Manager',
  webDir: 'www',
  server: {
    url: 'https://expense-manager-blue-six.vercel.app',
    cleartext: true
  }
};

export default config;
