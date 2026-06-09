import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import WardrobeScreen from '../screens/WardrobeScreen'
import RecommendScreen from '../screens/RecommendScreen'
import ProfileScreen from '../screens/ProfileScreen'
import OnboardScreen from '../screens/OnboardScreen'
import { Colors, Radius, Shadow } from '../utils/theme'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

const TAB_ICONS = {
  Wardrobe:  { icon: '👗', label: 'Closet' },
  Recommend: { icon: '✨', label: 'Outfits' },
  Profile:   { icon: '👤', label: 'Profile' },
}

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const focused = state.index === index
        const { icon, label } = TAB_ICONS[route.name]
        return (
          <TouchableOpacity key={route.key} style={styles.tabItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              navigation.navigate(route.name)
            }}>
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
              <Text style={styles.tabIcon}>{icon}</Text>
            </View>
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Wardrobe" component={WardrobeScreen} />
      <Tab.Screen name="Recommend" component={RecommendScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboard" component={OnboardScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingBottom: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 0,
    ...Shadow.medium,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabIconWrap: { width: 44, height: 32, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: Colors.stoneLight },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#bbb', fontWeight: '500' },
  tabLabelActive: { color: Colors.mink, fontWeight: '600' },
})
