// Configuration types - placeholder for future functionality
export interface AppConfiguration {
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface UserPreferences {
  userId: number;
  notifications: boolean;
  autoSave: boolean;
  defaultView: string;
}

export interface SystemSettings {
  companyName: string;
  companyLogo?: string;
  defaultTax: number;
  backupEnabled: boolean;
  backupInterval: number;
}
