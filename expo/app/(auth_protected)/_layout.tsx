import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedLayout() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Not logged in -> redirect
  if (!token) {
    return <Redirect href="/login" />;
  }

  // Auth OK -> show screens
  return <Stack screenOptions={{ headerShown: false }} />;
}