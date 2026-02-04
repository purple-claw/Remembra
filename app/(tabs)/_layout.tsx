import { Ionicons } from '@expo/vector-icons';
import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { BorderRadius, Colors } from '../../constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { session, loading } = useAuth();
  
  console.log('TabLayout - loading:', loading, 'session:', session ? 'exists' : 'none');
  
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }
  
  // Redirect to auth if not signed in
  if (!session) {
    console.log('No session, redirecting to auth');
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.accent,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        tabBarStyle: {
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          borderTopColor: Colors.dark.glassBorder,
          borderTopWidth: 1,
          height: 75,
          paddingBottom: 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'today' : 'today-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'library' : 'library-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: Colors.dark.accent + '20',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
});
