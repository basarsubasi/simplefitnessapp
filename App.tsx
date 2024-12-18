// App.tsx
import React, {useState } from 'react';
import { View,Text, ActivityIndicator, StatusBar, StyleSheet, Pressable } from 'react-native'; // Import Pressable here
import * as FileSystem from 'expo-file-system';
import { SQLiteProvider } from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Home from './screens/Home'; // Assuming you have a Home screen component
import Workouts from './screens/Workouts';
import CreateWorkout from './screens/CreateWorkout';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutDetails from './screens/WorkoutDetails';
import MyCalendar from './screens/MyCalendar';
import LogWorkout from './screens/LogWorkout';
import MyProgress from './screens/MyProgress';
import LogWeights from './screens/LogWeights';
import WeightLogDetail from './screens/WeightLogDetail';
import Settings from './screens/Settings';
import { SettingsProvider } from './context/SettingsContext';





const Bottom = createBottomTabNavigator();
const WorkoutStackScreen = createNativeStackNavigator<WorkoutStackParamList>();
const WorkoutLogStackScreen= createNativeStackNavigator<WorkoutLogStackParamList>();
const WeightLogStackScreen= createNativeStackNavigator<WeightLogStackParamList>();

const resetDatabase = async () => {
  try {
    const dbName = "SimpleDB.db";
    const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

    // Check if the database file exists
    const fileInfo = await FileSystem.getInfoAsync(dbFilePath);
    if (fileInfo.exists) {
      // Delete the existing database file
      console.log("Deleting existing database...");
      await FileSystem.deleteAsync(dbFilePath, { idempotent: true });
      console.log("Database deleted.");
    }

    // Recreate the database folder if necessary
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}SQLite`,
      { intermediates: true }
    );

    // Initialize a new database (or download a fresh copy)
    const dbAsset = require("./assets/SimpleDB.db");
    const dbUri = Asset.fromModule(dbAsset).uri;

    console.log("Downloading new database...");
    await FileSystem.downloadAsync(dbUri, dbFilePath);
    console.log("New database downloaded.");
  } catch (error) {
    console.error("Error resetting database:", error);
  }
};



const loadDatabase = async () => {
  try {
    const dbName = "SimpleDB.db";
    const dbAsset = require("./assets/SimpleDB.db");
    const dbUri = Asset.fromModule(dbAsset).uri;
    const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

    const fileInfo = await FileSystem.getInfoAsync(dbFilePath);

    if (!fileInfo.exists) {
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}SQLite`,
        { intermediates: true }
      );
      console.log("Downloading database...");
      await FileSystem.downloadAsync(dbUri, dbFilePath);
    } else {
      console.log("Database already exists.");
    }
  } catch (error) {
    console.error("Error in loadDatabase:", error);
  }
};


export type WorkoutStackParamList = {
  WorkoutsList: undefined; // No parameters for this route
  CreateWorkout: undefined; // No parameters for this route
  WorkoutDetails: { workout_id: number }; // Add this
};

export type WorkoutLogStackParamList = {
  MyCalendar: undefined; // No parameters for this route
  LogWorkout: undefined; // No parameters for this route
};
export type WeightLogStackParamList = {
  MyProgress: undefined;
  LogWeights: undefined;
  WeightLogDetail:{ workoutName: string }
}

function WorkoutStack() {
  return (
    <WorkoutStackScreen.Navigator screenOptions={{
      headerShown: false, // Disable headers for all screens in this stack
    }}
  >
      <WorkoutStackScreen.Screen
        name="WorkoutsList"
        component={Workouts}
        options={{ headerShown: false }}
      />
      <WorkoutStackScreen.Screen
        name="CreateWorkout"
        component={CreateWorkout}
        options={{ title: 'Create Workout' }}
      />
      <WorkoutStackScreen.Screen
        name='WorkoutDetails'
        component={WorkoutDetails}
        options={{title: 'WorkoutDetails'}}
        />
    </WorkoutStackScreen.Navigator>
  );
}

function WorkoutLogStack() {
  return (
    <WorkoutLogStackScreen.Navigator
      screenOptions={{
        headerShown: false, // Disable headers for all screens in this stack
      }}
    >
      <WorkoutLogStackScreen.Screen
        name="MyCalendar"
        component={MyCalendar}
        options={{ headerShown: false }} // No header for MyCalendar screen
      />
      <WorkoutLogStackScreen.Screen
        name="LogWorkout"
        component={LogWorkout}
        options={{ title: 'Log a Workout' }} // Title for the LogWorkout screen
      />
    </WorkoutLogStackScreen.Navigator>
  );
}


function WeightLogStack() {
  return (
    <WeightLogStackScreen.Navigator
      screenOptions={{
        headerShown: false, // Disable headers for all screens in this stack
      }}
    >
      <WeightLogStackScreen.Screen
        name="MyProgress"
        component={MyProgress}
        options={{ headerShown: false }} // No header for MyCalendar screen
      />
      <WeightLogStackScreen.Screen
        name="LogWeights"
        component={LogWeights}
        options={{ title: 'Log Weights' }} // Title for the LogWorkout screen
      />

<WeightLogStackScreen.Screen
        name="WeightLogDetail"
        component={WeightLogDetail}
        options={{ headerShown: false }} // No header for MyCalendar screen
      />
    
    </WeightLogStackScreen.Navigator>
  );
}


export default function App() {
  const [dbLoaded, setDbLoaded] = useState<boolean>(false);

  React.useEffect(() => {
    (async () => {
      try {
        //await resetDatabase();
        await loadDatabase();
        setDbLoaded(true);
      } catch (e) {
        console.error("Database loading error:", e);
      }
    })();
  }, []);
  
  if (!dbLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView>
      <SettingsProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <React.Suspense
          fallback={
            <View style={{ flex:1}}>
              <ActivityIndicator size={'large'}/>
              <Text> Loading Database...</Text>
            </View>
          }
          />

        <SQLiteProvider databaseName="SimpleDB.db" useSuspense>
          <Bottom.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabBarLabel,
              tabBarActiveTintColor: 'black', // Active icon color
              tabBarInactiveTintColor: 'gray', // Inactive icon color
            }}
          >
            <Bottom.Screen
              name="Home"
              component={Home}
              options={{
                tabBarButton: (props) => (
                  <TabButton {...props} iconName="home" />
                ),
                tabBarLabel: 'Home',
              }}
            />
            <Bottom.Screen
              name="My Workouts"
              component={WorkoutStack}
              options={{
                tabBarButton: (props) => (
                  <TabButton {...props} iconName="barbell" />
                ),
                tabBarLabel: 'My Workouts',
              }}
            />
            <Bottom.Screen
              name="My Calendar"
              component={WorkoutLogStack}
              options={{
                tabBarButton: (props) => (
                  <TabButton {...props} iconName="calendar" />
                ),
                tabBarLabel: 'My Calendar',
              }}
            />
            <Bottom.Screen
              name="My Progress"
              component={WeightLogStack}
              options={{
                tabBarButton: (props) => (
                  <TabButton {...props} iconName="stats-chart" />
                ),
                tabBarLabel: 'My Progress',
              }}
            />

<Bottom.Screen
  name="Settings"
  component={Settings}
  options={{
    tabBarButton: (props) => (
      <TabButton {...props} iconName="settings-sharp" />
    ),
    tabBarLabel: 'Settings',
  }}
/>

          </Bottom.Navigator>
        </SQLiteProvider>
      </NavigationContainer>
      </SettingsProvider>
      </GestureHandlerRootView>
  );
}

// Custom TabButton component to handle icon rendering
const TabButton = (props: any) => {
  const { accessibilityState, onPress } = props;
  const isSelected = accessibilityState?.selected; // Use optional chaining

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Ionicons name={props.iconName} size={24} color={isSelected ? 'black' : 'gray'} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    elevation: 10,
    height: 60, // Adjusted height for a larger tab bar
    paddingVertical: 10, // Reduced padding to balance spacing
  },
  tabBarLabel: {
    fontSize: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
});



