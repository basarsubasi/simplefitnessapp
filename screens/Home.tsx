import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BannerAdComponent from '../components/BannerAd'; // Import the BannerAdComponent
import { useTheme } from '../context/ThemeContext';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  headerContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center', // Center the title horizontally
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: height * 0.22,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 10,
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  lightGrayText: {
    color: 'white',
  },
  adContainer: {
    alignItems: 'center',
  },
});
