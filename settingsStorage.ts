import * as FileSystem from 'expo-file-system';

const SETTINGS_FILE = `${FileSystem.documentDirectory}userSettings.json`;

// Save settings to file
export const saveSettings = async (settings: object) => {
  try {
    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
    console.log('Settings saved successfully.');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

// Load settings from file
export const loadSettings = async () => {
  try {
    // Check if the settings file exists
    const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE);

    if (!fileInfo.exists) {
      console.log("Settings file doesn't exist, using default settings.");
      return { message: 'No settings file, using default settings.' }; // Default response
    }

    // Read and parse the file
    const settings = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    return JSON.parse(settings);
  } catch (error) {
    if (error instanceof Error) { console.warn('Unexpected error happened:', error);
    } else {
      console.warn('Unexpected error:', error);
    }
    return { message: 'No settings file, using default settings.' }; // Default response
  }
};
