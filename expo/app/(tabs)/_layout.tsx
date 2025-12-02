// app/(tabs)/_layout.tsx
import { AiDisclaimerButton } from "@/components/ai-disclaimer-button";
import { LogoutButton } from "@/components/logout-button";
import { NotificationsButton } from "@/components/notifications-button";
import { PreferencesButton } from "@/components/preferences-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../../context/AuthContext";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#050510",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  // If not logged in → send to login
  if (!token) {
    return <Redirect href="/login" />;
  }

  // Authenticated → show tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <NotificationsButton />
            <AiDisclaimerButton />
            <PreferencesButton />
            <LogoutButton />
          </View>
        ),
        headerTitleAlign: "left",
        headerTitleStyle: { flexShrink: 1 },
      }}
    >

      {/* Inventory Tab */}
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cart.fill" color={color} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />

      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />

      {/* Recipes Tab */}
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="fork.knife" color={color} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />

    </Tabs>
  );
}
