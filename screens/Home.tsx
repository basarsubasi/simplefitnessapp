import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ScaledSheet, scale } from 'react-native-size-matters'; // Import ScaledSheet for scaling
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';





const { height } = Dimensions.get('window'); // Get screen height for dynamic sizing

export default function Home({ navigation }: any) {
  const { theme } = useTheme(); // Get the current theme
  const { t } = useTranslation(); // Initialize translations

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        {/* App Title */}
        <Text style={[styles.title, { color: theme.text }]}>Simple.</Text>
      </View>

      {/* Create a Workout Section */}
      <View style={[styles.card, { backgroundColor: theme.homeCardColor1 }]}>
        <Text style={[styles.cardTitle, { color: theme.homeCardText1 }]}>
        {t('homeCreateWorkout')}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.homeButtonColor1 }]}
          onPress={() => navigation.navigate('My Workouts')}
        >
          <Text style={[styles.buttonText, { color: theme.homeButtonText1 }]}>{t('homeGotoWorkouts')}</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Your Workout Section */}
      <View style={[styles.card, { backgroundColor: theme.homeCardColor3 }]}>
        <Text style={[styles.cardTitle, { color: theme.homeCardText2 }]}>
        {t('homeScheduleWorkouts')}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.homeButtonColor2 }]}
          onPress={() => navigation.navigate('My Calendar')}
        >
          <Text style={[styles.buttonText, { color: theme.homeButtonText2 }]}> {t('homeGotoCalendar')}</Text>
        </TouchableOpacity>
      </View>

      {/* Track Your Progress Section */}
      <View style={[styles.card, { backgroundColor: theme.homeCardColor2 }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
        {t('homeTrackProgress')}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.homeButtonColor3 }]}
          onPress={() => navigation.navigate('My Progress')}
        >
          <Text style={[styles.buttonText, { color: theme.homeButtonText3 }]}>{t('homeGotoProgress')}</Text>
        </TouchableOpacity>
        
      </View>

      <View style={styles.communityButtonGroup}>
            <TouchableOpacity
              style={[
                styles.communityButton,
                { backgroundColor: '#121212' },
              ]}
              onPress={() => Linking.openURL('https://discord.gg/A38Ny7UggP')}
            >
              <View style={styles.communityButtonContent}>
                <Ionicons
                  name='logo-discord'
                  size={scale(20)}
                  color={'#FFFFFF'}
                  style={styles.communityButtonIcon}
                />
                <Text
                  style={[
                    styles.communityButtonText,
                    { color: '#FFFFFF' },
                  ]}
                >
                  {t('Discord')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.communityButton,
                { backgroundColor: '#FFFFFF' },
              ]}
              onPress={() =>
                Linking.openURL(
                  'https://github.com/basarsubasi/simplefitnessapp',
                )
              }
            >
              <View style={styles.communityButtonContent}>
                <Ionicons
                  name='logo-github'
                  size={scale(20)}
                  color={'#000000'}
                  style={styles.communityButtonIcon}
                />
                <Text
                  style={[
                    styles.communityButtonText,
                    { color: '#000000' },
                  ]}
                >
                  {t('GitHub')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
    </View>
  );
}

// Home.tsx

const styles = ScaledSheet.create({
  container: {
    flex: 1,
    paddingTop: '10@vs',
  },
  headerContainer: {
    position: 'relative',
    marginBottom: '15@vs', // Slightly reduced scaled margin
  },
  title: {
    fontSize: '36@s', // Smaller scaled font size
    fontWeight: '900',
    textAlign: 'center',
  },
  card: {
    borderRadius: 15, // Keep fixed border radius for better uniformity
    padding: '13@s', // Slightly reduced padding
    marginBottom: '12@vs', // Reduced vertical margin
    justifyContent: 'center',
    alignItems: 'center',
    height: '140@vs', // Adjusted height to be smaller
    width: '90%', // Add a width constraint
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: '20@s', // Smaller scaled font size
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: '26@s', // Adjusted line height
  },
  button: {
    borderRadius: 20, // Keep fixed radius for consistency
    paddingVertical: '6@vs', // Slightly reduced padding
    paddingHorizontal: '14@s', // Adjusted padding
    marginTop: '8@vs', // Reduced vertical margin
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: '14@s', // Smaller font size for button text
    fontWeight: '800',
  },

  lightGrayText: {
    color: 'white',
  },
  adContainer: {
    alignItems: 'center',
  },
  communityButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: '30@s',
    marginTop: '1@vs',
    gap: '10@s',
    width: '100%',
    alignSelf: 'center',
  },
  communityButton: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: '8@vs',
    flex: 1,
  },
  communityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityButtonIcon: {
    marginRight: '8@s',
  },
  communityButtonText: {
    fontSize: '16@s',
    fontWeight: '700',
  },
});