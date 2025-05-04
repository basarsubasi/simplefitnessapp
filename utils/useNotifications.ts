import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { 
  requestNotificationPermissions,
  scheduleWorkoutNotification, 
  cancelWorkoutNotification,
  getAllScheduledNotifications
} from './notificationUtils';
import { useSettings } from '../context/SettingsContext';

/**
 * Custom hook for managing notifications in the app
 */
export const useNotifications = () => {
  const [loading, setLoading] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<Notifications.NotificationRequest[]>([]);
  
  const { 
    notificationPermissionGranted,
    setNotificationPermissionGranted
  } = useSettings();

  // 1) Check if notification permission is granted
  const checkNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }, []);

  // 2) Request permission and update settings context
  const requestNotificationPermission = useCallback(async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermissions();
      setNotificationPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setNotificationPermissionGranted]);

  // Update notifications list when permissions change
  useEffect(() => {
    const loadNotifications = async () => {
      if (notificationPermissionGranted) {
        try {
          const notifications = await getAllScheduledNotifications();
          setScheduledNotifications(notifications);
          console.log('Loaded notifications:', notifications.length);
        } catch (error) {
          console.error('Error loading notifications:', error);
        }
      } else {
        setScheduledNotifications([]);
      }
    };
    
    loadNotifications();
  }, [notificationPermissionGranted]);

  // 3) Schedule a workout notification
  const scheduleNotification = useCallback(async (params: {
    workoutName: string;
    dayName: string;
    scheduledDate: Date;
    notificationTime: Date;
  }) => {
    // Only proceed if notification permissions are enabled
    if (!notificationPermissionGranted) {
      console.log('Notifications disabled in app settings');
      return null;
    }
    
    const notificationId = await scheduleWorkoutNotification(params);
    
    // Refresh the notification list if successful
    if (notificationId) {
      const notifications = await getAllScheduledNotifications();
      setScheduledNotifications(notifications);
    }
    
    return notificationId;
  }, [notificationPermissionGranted]);

  // 4) Cancel a single notification
  const cancelNotification = useCallback(async (notificationId: string) => {
    const success = await cancelWorkoutNotification(notificationId);
    
    // Refresh the notification list if successful
    if (success) {
      const notifications = await getAllScheduledNotifications();
      setScheduledNotifications(notifications);
    }
    
    return success;
  }, []);

  // 5) Cancel all notifications
  const cancelAllNotifications = useCallback(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setScheduledNotifications([]);
      return true;
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      return false;
    }
  }, []);

  return {
    loading,
    scheduledNotifications,
    notificationPermissionGranted,
    checkNotificationPermission,
    requestNotificationPermission,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications
  };
};