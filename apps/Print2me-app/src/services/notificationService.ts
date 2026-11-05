import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SoundService } from './soundService';

// Configure default notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

const FCM_TOKEN_STORAGE_KEY = 'PRINT2ME_FCM_DEVICE_TOKEN';

export interface PushNotificationState {
  hasPermission: boolean;
  fcmToken: string | null;
  expoPushToken: string | null;
  error: string | null;
}

/**
 * Configure Android notification channels and request user permissions
 */
export async function registerForPushNotificationsAsync(): Promise<PushNotificationState> {
  const result: PushNotificationState = {
    hasPermission: false,
    fcmToken: null,
    expoPushToken: null,
    error: null,
  };

  try {
    if (Platform.OS === 'android') {
      // Force-delete ALL known channels (including fallbacks) before recreating.
      // Android channels are IMMUTABLE — sound cannot be changed without delete+recreate.
      const channelsToDelete = [
        'orders',
        'orders_v2',
        'orders_bell_channel',
        'print2me_orders_bell_v1',
        'expo_notifications_fallback_notification_channel',
        'fcm_fallback_notification_channel',
        'general',
      ];
      await Promise.all(
        channelsToDelete.map((id) => Notifications.deleteNotificationChannelAsync(id).catch(() => {}))
      );

      // Register primary orders channel with custom chime
      await Notifications.setNotificationChannelAsync('print2me_orders_bell_v1', {
        name: 'Print2Me New Orders',
        description: 'Instant alerts with custom counter chime for incoming print requests',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#208AEF',
        sound: 'order_bell.wav',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
        enableVibrate: true,
        showBadge: true,
      });

      // Also set custom chime on the fallback channel so unassigned FCM pushes play custom chime
      await Notifications.setNotificationChannelAsync('expo_notifications_fallback_notification_channel', {
        name: 'Print2Me Push Fallback',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#208AEF',
        sound: 'order_bell.wav',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
        enableVibrate: true,
        showBadge: true,
      });

      // Register Google Play Services FCM internal fallback channel with custom chime
      await Notifications.setNotificationChannelAsync('fcm_fallback_notification_channel', {
        name: 'Print2Me Order Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#208AEF',
        sound: 'order_bell.wav',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
        enableVibrate: true,
        showBadge: true,
      });

      // General announcements channel
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      result.error = 'Notification permissions not granted';
      return result;
    }

    result.hasPermission = true;

    // Retrieve FCM native device registration token
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      if (deviceToken && deviceToken.data) {
        result.fcmToken = String(deviceToken.data);
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync(FCM_TOKEN_STORAGE_KEY, result.fcmToken);
        }
      }
    } catch (err: any) {
      console.warn('[NotificationService] Could not retrieve native FCM token:', err?.message);
    }

    // Retrieve Expo push token if available
    try {
      const expoToken = await Notifications.getExpoPushTokenAsync();
      if (expoToken && expoToken.data) {
        result.expoPushToken = expoToken.data;
      }
    } catch (err: any) {
      console.log('[NotificationService] Expo token fetch (optional):', err?.message);
    }

    return result;
  } catch (error: any) {
    console.error('[NotificationService] Registration failed:', error);
    result.error = error?.message || 'Unknown registration error';
    return result;
  }
}

/**
 * Retrieve cached FCM device token
 */
export async function getCachedFcmToken(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      return await SecureStore.getItemAsync(FCM_TOKEN_STORAGE_KEY);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Trigger an immediate high-priority local push notification test
 */
export async function triggerTestNotification(title?: string, body?: string) {
  try {
    await SoundService.playNewOrderAlert();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || '🖨️ New Order Received! (Token #01)',
        body: body || 'Customer paid ₹40.00 • 4 Pages (Color) ready to print.',
        sound: 'order_bell.wav',
        data: {
          orderId: 'test_order_1',
          token: '01',
          type: 'NEW_ORDER',
        },
      },
      trigger: {
        channelId: 'print2me_orders_bell_v1',
      },
    });
    return true;
  } catch (error) {
    console.error('[NotificationService] Failed to schedule test notification:', error);
    return false;
  }
}
