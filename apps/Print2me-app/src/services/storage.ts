import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import serverConfig, { normalizeServerUrl, DEFAULT_SERVER_URL } from '../constants/serverConfig';

const TOKEN_KEY = 'print2me_vendor_token';
const VENDOR_KEY = 'print2me_vendor_data';
const API_URL_KEY = 'print2me_api_url';
const LAST_CONFIG_URL_KEY = 'print2me_last_config_url';

export const StorageService = {
  async getAuthToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAuthToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (err) {
      console.warn('Storage set error:', err);
    }
  },

  async removeAuthToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (err) {
      console.warn('Storage remove error:', err);
    }
  },

  async getVendorData(): Promise<any | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = localStorage.getItem(VENDOR_KEY);
      } else {
        raw = await SecureStore.getItemAsync(VENDOR_KEY);
      }
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setVendorData(data: any): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      if (Platform.OS === 'web') {
        localStorage.setItem(VENDOR_KEY, serialized);
      } else {
        await SecureStore.setItemAsync(VENDOR_KEY, serialized);
      }
    } catch (err) {
      console.warn('Storage set vendor error:', err);
    }
  },

  async removeVendorData(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(VENDOR_KEY);
      } else {
        await SecureStore.deleteItemAsync(VENDOR_KEY);
      }
    } catch (err) {
      console.warn('Storage remove vendor error:', err);
    }
  },

  async clearAuthSession(): Promise<void> {
    await this.removeAuthToken();
    await this.removeVendorData();
  },

  async getApiBaseUrl(): Promise<string> {
    try {
      // 1. Read configured URL from server.config.json
      const configUrl = normalizeServerUrl(serverConfig?.serverUrl);

      let lastSeenConfig: string | null = null;
      let storedUrl: string | null = null;

      if (Platform.OS === 'web') {
        lastSeenConfig = localStorage.getItem(LAST_CONFIG_URL_KEY);
        storedUrl = localStorage.getItem(API_URL_KEY);
      } else {
        lastSeenConfig = await SecureStore.getItemAsync(LAST_CONFIG_URL_KEY);
        storedUrl = await SecureStore.getItemAsync(API_URL_KEY);
      }

      // If server.config.json was modified by the developer, it takes top priority and updates stored URL!
      if (configUrl && configUrl !== lastSeenConfig) {
        if (Platform.OS === 'web') {
          localStorage.setItem(LAST_CONFIG_URL_KEY, configUrl);
          localStorage.setItem(API_URL_KEY, configUrl);
        } else {
          await SecureStore.setItemAsync(LAST_CONFIG_URL_KEY, configUrl);
          await SecureStore.setItemAsync(API_URL_KEY, configUrl);
        }
        return configUrl;
      }

      // 2. If a custom URL was saved in-app and config hasn't changed, use storedUrl
      if (storedUrl && storedUrl.trim().length > 0) {
        return normalizeServerUrl(storedUrl);
      }

      // 3. Fallback to server.config.json or default
      if (configUrl) {
        return configUrl;
      }

      return DEFAULT_SERVER_URL;
    } catch {
      return DEFAULT_SERVER_URL;
    }
  },

  async setApiBaseUrl(url: string): Promise<void> {
    try {
      const normalized = normalizeServerUrl(url);
      if (Platform.OS === 'web') {
        localStorage.setItem(API_URL_KEY, normalized);
      } else {
        await SecureStore.setItemAsync(API_URL_KEY, normalized);
      }
    } catch (err) {
      console.warn('Storage set api url error:', err);
    }
  },

  async getAutoPrint(): Promise<boolean> {
    try {
      let val: string | null = null;
      if (Platform.OS === 'web') {
        val = localStorage.getItem('print2me_auto_print');
      } else {
        val = await SecureStore.getItemAsync('print2me_auto_print');
      }
      return val === null ? true : val === 'true'; // Default enabled
    } catch {
      return true;
    }
  },

  async setAutoPrint(enabled: boolean): Promise<void> {
    try {
      const val = enabled ? 'true' : 'false';
      if (Platform.OS === 'web') {
        localStorage.setItem('print2me_auto_print', val);
      } else {
        await SecureStore.setItemAsync('print2me_auto_print', val);
      }
    } catch (err) {
      console.warn('Storage set auto-print error:', err);
    }
  },

  async getKeepAwake(): Promise<boolean> {
    try {
      let val: string | null = null;
      if (Platform.OS === 'web') {
        val = localStorage.getItem('print2me_keep_awake');
      } else {
        val = await SecureStore.getItemAsync('print2me_keep_awake');
      }
      return val === null ? true : val === 'true'; // Default active for counter display
    } catch {
      return true;
    }
  },

  async setKeepAwake(enabled: boolean): Promise<void> {
    try {
      const val = enabled ? 'true' : 'false';
      if (Platform.OS === 'web') {
        localStorage.setItem('print2me_keep_awake', val);
      } else {
        await SecureStore.setItemAsync('print2me_keep_awake', val);
      }
    } catch (err) {
      console.warn('Storage set keep-awake error:', err);
    }
  },

  async getSoundAlert(): Promise<boolean> {
    try {
      let val: string | null = null;
      if (Platform.OS === 'web') {
        val = localStorage.getItem('print2me_sound_alert');
      } else {
        val = await SecureStore.getItemAsync('print2me_sound_alert');
      }
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  async setSoundAlert(enabled: boolean): Promise<void> {
    try {
      const val = enabled ? 'true' : 'false';
      if (Platform.OS === 'web') {
        localStorage.setItem('print2me_sound_alert', val);
      } else {
        await SecureStore.setItemAsync('print2me_sound_alert', val);
      }
    } catch (err) {
      console.warn('Storage set sound-alert error:', err);
    }
  },

  async getPrinterUrl(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem('print2me_printer_url');
      }
      return await SecureStore.getItemAsync('print2me_printer_url');
    } catch {
      return null;
    }
  },

  async setPrinterUrl(url: string | null): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (url) localStorage.setItem('print2me_printer_url', url);
        else localStorage.removeItem('print2me_printer_url');
      } else {
        if (url) await SecureStore.setItemAsync('print2me_printer_url', url);
        else await SecureStore.deleteItemAsync('print2me_printer_url');
      }
    } catch (err) {
      console.warn('Storage set printer url error:', err);
    }
  },
};
