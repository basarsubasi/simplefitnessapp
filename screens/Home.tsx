import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BannerAdComponent from '../components/BannerAd'; // Import the BannerAdComponent
import { useTheme } from '../context/ThemeContext';
import { ScaledSheet } from 'react-native-size-matters'; // Import ScaledSheet for scaling

const { height } = Dimensions.get('window'); // Get screen height for dynamic sizing

export default function Home({ navigation }: any) {
  const { theme } = useTheme(); // Get the current theme

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        {/* App Title */}
        <Text style={[styles.title, { color: theme.text }]}>Simple.</Text>
      </View>

      {/* Create a Workout Section */}
      <View style={[styles.card, { backgroundColor: theme.homeCardColor1 }]}>
        <Text style={[styles.cardTitle, { color: theme.homeCardText1 }]}>
          Create a{"\n"}workout.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.homeButtonColor1 }]}
          onPress={() => navigation.navigate('My Workouts')}
        >
          <Text style={[styles.buttonText, { color: theme.homeButtonText1 }]}>Go to My Workouts &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Your Workout Section */}
      <View style={[styles.card, { backgroundColor: theme.homeCardColor3 }]}>
        <Text style={[styles.cardTitle, { color: theme.homeCardText2 }]}>
          Schedule{"\n"}your{"\n"}workout.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.homeButtonColor2 }]}
          onPress={() => navigation.navigate('My Calendar')}
        >
          <Text style={[styles.buttonText, { color: theme.homeButtonText2 }]}>Go to My Calendar &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* Track Your Progress Section */}
      <View style={[styles.card, { backgroundColor: theme.homeCardColor2 }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Track{"\n"}your{"\n"}progress.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.homeButtonColor3 }]}
          onPress={() => navigation.navigate('My Progress')}
        >
          <Text style={[styles.buttonText, { color: theme.homeButtonText3 }]}>Go to My Progress &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* Banner Ad Section */}
      <View style={styles.adContainer}>
        <BannerAdComponent />
      </View>
    </View>
  );
}

// Home.tsx

const styles = ScaledSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20, // Keep fixed padding for consistency
    paddingTop: 30, // Fixed padding
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
});