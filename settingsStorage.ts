import * as FileSystem from 'expo-file-system';

// Make sure to use backticks here:
const SETTINGS_FILE = `${FileSystem.documentDirectory}userSettings.json`;

export const saveSettings = async (settings: object) => {
  try {
    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
    console.log('Settings saved successfully.');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const loadSettings = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (!fileInfo.exists) {
      console.log("Settings file doesn't exist, using default settings.");
      return null;
    }

    const settings = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    return JSON.parse(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
};
