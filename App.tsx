  // App.tsx
  import React, {useState } from 'react';
  import { View, ActivityIndicator, StatusBar, StyleSheet, Pressable } from 'react-native'; // Import Pressable here
  import * as FileSystem from 'expo-file-system';
  import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
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
  import './i18n'; // Ensure this is present to initialize i18n
  import i18n from './i18n'; // Import the i18n instance
  import { I18nextProvider } from 'react-i18next';
  import Settings from './screens/Settings';
  import { SettingsProvider } from './context/SettingsContext';
  import { ThemeProvider, useTheme } from './context/ThemeContext';
import EditWorkout from './screens/EditWorkout';
  import { loadSettings } from './settingsStorage';
  
  import AllLogs from './screens/AllLogs';
import Difficulty from './screens/Difficulty';
import Template from './screens/Template';
import TemplateDetails from './screens/TemplateDetails';
import { insertWorkouts } from './insertWorkouts';





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
    EditWorkout: { workout_id: number }; // Only `workout_id` for editing a workout
    TemplateList: undefined;
    DifficultyList: undefined;
    Difficulty: undefined;
    Template: { workout_difficulty: string };
    TemplateDetails: { workout_id: number };
  };

  export type WorkoutLogStackParamList = {
    MyCalendar: undefined; // No parameters for this route
    LogWorkout: undefined; // No parameters for this route
  };

  export type WeightLogStackParamList = {
    MyProgress: undefined;
    LogWeights: undefined;
    WeightLogDetail:{ workoutName: string }
    AllLogs: undefined;
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
             <WorkoutStackScreen.Screen
          name='EditWorkout'
          component={EditWorkout}
          options={{title: 'EditWorkout'}}
          />
                       <WorkoutStackScreen.Screen
          name='Difficulty'
          component={Difficulty}
          options={{title: 'Difficulty'}}
          />
                       <WorkoutStackScreen.Screen
          name='Template'
          component={Template}
          options={{title: 'Template'}}
          />
                       <WorkoutStackScreen.Screen
          name='TemplateDetails'
          component={TemplateDetails}
          options={{title: 'TemplateDetails'}}
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
      <WeightLogStackScreen.Screen
          name="AllLogs"
          component={AllLogs}
          options={{ headerShown: false }} // No header for MyCalendar screen
        />    
      
      </WeightLogStackScreen.Navigator>
    );
  }
// Define AppContent here
const AppContent = () => {
  const { theme } = useTheme(); // Access the theme context
  const [dbLoaded, setDbLoaded] = useState<boolean>(false);
  const db = useSQLiteContext(); // Ensure SQLite context is accessible
  const addTables = async (db: any) => {
    try {
   await db.runAsync(
        
          `CREATE TABLE IF NOT EXISTS Template_Workouts (
            workout_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            workout_name TEXT NOT NULL UNIQUE,
            workout_difficulty TEXT NOT NULL
          );`
        );
  
       await db.runAsync(
          `CREATE TABLE IF NOT EXISTS Template_Days (
            day_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            workout_id INTEGER NOT NULL,
            day_name TEXT NOT NULL,
            FOREIGN KEY (workout_id) REFERENCES Template_Workouts(workout_id) ON DELETE CASCADE,
            UNIQUE(workout_id, day_name)
          );`
        );
  
        await db.runAsync(
          `CREATE TABLE IF NOT EXISTS Template_Exercises (
            exercise_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            day_id INTEGER NOT NULL,
            exercise_name TEXT NOT NULL,
            sets INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            FOREIGN KEY (day_id) REFERENCES Template_Days(day_id) ON DELETE CASCADE
            UNIQUE(day_id, exercise_name)
          );`
        );
        console.log("tables created")
    } catch (error) {
      console.error('Database initialization error:', error);
    }

  };

  React.useEffect(() => {
    (async () => {
      try {
        //await resetDatabase();
        await loadDatabase();
        await addTables(db);
        await insertWorkouts(db);
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
    <>
         <StatusBar   barStyle={theme.type === 'light' ? "dark-content" : "light-content"}  backgroundColor={theme.background}  />
          <React.Suspense
            fallback={
              <View style={{ flex:1}}>
                <ActivityIndicator size={'large'}/>
              </View>
            }
            />

            <Bottom.Navigator
                screenOptions={{
                  headerShown: false,
                  tabBarStyle: {
                    backgroundColor: theme.background, // Dynamically set based on theme
                    borderTopWidth: 0, // Removes the top border of the tab bar
                    elevation: 0, // Removes shadow on Android
                    shadowOpacity: 0, // Removes shadow on iOS
                    height: 60,
                    paddingVertical: 10,
                  },
                  tabBarActiveTintColor: theme.text, // Active icon color
                  tabBarInactiveTintColor: theme.inactivetint, // Inactive icon color
                }}
            >
              <Bottom.Screen
                name="Home"
                component={Home}
                options={{
                  tabBarButton: (props) => (
                    <TabButton {...props} iconName="home" />
                  ),
                }}
              />
              <Bottom.Screen
                name="My Workouts"
                component={WorkoutStack}
                options={{
                  tabBarButton: (props) => (
                    <TabButton {...props} iconName="barbell" />
                  ),
                }}
              />
              <Bottom.Screen
                name="My Calendar"
                component={WorkoutLogStack}
                options={{
                  tabBarButton: (props) => (
                    <TabButton {...props} iconName="calendar" />
                  ),
                }}
              />
              <Bottom.Screen
                name="My Progress"
                component={WeightLogStack}
                options={{
                  tabBarButton: (props) => (
                    <TabButton {...props} iconName="stats-chart" />
                  ),
                }}
              />

       <Bottom.Screen
         name="Settings"
         component={Settings}
         options={{
           tabBarButton: (props) => (
             <TabButton {...props} iconName="settings-sharp" />
           ),
         }}
       />

                 </Bottom.Navigator>
         </>
  );
};



  export default function App() {


    return (
      <ThemeProvider>
      <GestureHandlerRootView>
        <NavigationContainer>
          <SettingsProvider>
          <I18nextProvider i18n={i18n}>
          <AppContent/> {/* Use AppContent here */}
          </I18nextProvider>
          </SettingsProvider>
         
        </NavigationContainer>
        
      </GestureHandlerRootView>
    </ThemeProvider>
    );
  }

  // Custom TabButton component to handle icon rendering
  const TabButton = (props: any) => {
    const { accessibilityState, onPress } = props;
    const isSelected = accessibilityState?.selected; // Use optional chaining
    const { theme } = useTheme(); // Retrieve the theme here


    return (
      <Pressable onPress={onPress} style={styles.tabButton}>
        <Ionicons   
        name={props.iconName} 
        size={24} 
        color={isSelected ? theme.text : theme.inactivetint}  />
      </Pressable>
    );
  };

  const styles = StyleSheet.create({
    tabBar: {
      backgroundColor: '#ffffff',
      borderTopWidth: 2,
      elevation: 10,
      height: 60, // Adjusted height for a larger tab bar
      paddingVertical: 10, // Reduced padding to balance spacing
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 1,
    },
  });