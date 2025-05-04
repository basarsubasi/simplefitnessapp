import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from './i18n'; // Import i18n

// Configure the notification handler to show alerts when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Request permission for notifications
export const requestNotificationPermissions = async (): Promise<boolean> => {
  // Remove or comment out this condition to allow emulator testing
  // if (!Device.isDevice) {
  //   console.log('Cannot request notifications on simulator/emulator');
  //   return false;
  // }

  // Create notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('workout-reminders', {
      name: 'Workout Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

// Interface for scheduling a workout notification
interface ScheduleWorkoutNotificationProps {
  workoutName: string;
  dayName: string;
  scheduledDate: Date;
  notificationTime: Date; // Time to receive notification on the workout day
}

// Schedule a notification for an upcoming workout
export const scheduleWorkoutNotification = async ({
  workoutName,
  dayName,
  scheduledDate,
  notificationTime,
}: ScheduleWorkoutNotificationProps): Promise<string | null> => {
  try {
    // Ensure we have permission
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    // Create a Date object for the notification
    const triggerDate = new Date(scheduledDate);
    triggerDate.setHours(
      notificationTime.getHours(),
      notificationTime.getMinutes(),
      0,
      0
    );

    // Don't schedule if the time is in the past
    if (triggerDate <= new Date()) {
      console.log('Cannot schedule notification for past time');
      return null;
    }

    // Schedule the notification with translations
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('workoutReminderTitle', { workoutName: workoutName }),
        body: i18n.t('workoutReminderBody', { dayName: dayName }),
        data: { 
          workoutName, 
          dayName, 
          scheduledDate: scheduledDate.toISOString(),
          }
      },
      trigger: {
        date: triggerDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE
      },
    });

    console.log(`Scheduled notification: ${notificationId} for ${triggerDate.toLocaleString()}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Cancel a scheduled notification
export const cancelWorkoutNotification = async (notificationId: string): Promise<boolean> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Cancelled notification: ${notificationId}`);
    return true;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
};

// Get all scheduled notifications
export const getAllScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  return await Notifications.getAllScheduledNotificationsAsync();
};