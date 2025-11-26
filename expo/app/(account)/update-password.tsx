// app/update-password.tsx
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";

const UpdatePasswordScreen: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInitializing, setSessionInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount, read access_token + refresh_token from the URL hash
  // and hydrate the Supabase session so updateUser() works.
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window === "undefined") {
          // Not running on web; recovery link is web-only
          setSessionInitializing(false);
          return;
        }

        const hash = window.location.hash;
        if (!hash) {
          setSessionInitializing(false);
          setError("Missing recovery token. Please request a new password reset link.");
          return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.log("Error setting Supabase session:", error);
            setError("Invalid or expired recovery link. Please request a new one.");
          }
        } else {
          setError("Missing recovery token. Please request a new password reset link.");
        }
      } catch (e: any) {
        console.log("Error initializing recovery session:", e);
        setError("Could not initialize password reset. Please try again.");
      } finally {
        setSessionInitializing(false);
      }
    };

    init();
  }, []);

  const handleUpdatePassword = async () => {
    setError(null);

    if (!password || !confirm) {
      setError("Please fill out both password fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.auth.updateUser({ password });

      if (supabaseError) {
        console.log("updateUser error:", supabaseError);
        setError(supabaseError.message || "Failed to update password.");
      } else {
 
        await supabase.auth.signOut();

        router.replace("/login");
      }
    } catch (e: any) {
      console.log("updateUser caught error:", e);
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || sessionInitializing;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        {/* Simple title, no back button */}
        <Text style={styles.title}>Update your password</Text>
        <Text style={styles.subtitle}>
          Enter and confirm your new password below. You will need to log in again afterwards.
        </Text>

        <View style={styles.card}>
          {sessionInitializing && (
            <View style={{ marginBottom: 16, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ color: "#9ca3af", marginTop: 6, fontSize: 13 }}>
                Preparing secure reset session...
              </Text>
            </View>
          )}

          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#777"
            editable={!isBusy}
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            placeholderTextColor="#777"
            editable={!isBusy}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8 },
              isBusy && { opacity: 0.7 },
            ]}
            onPress={handleUpdatePassword}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#f9fafb" />
            ) : (
              <Text style={styles.buttonText}>Update password</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default UpdatePasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050510",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#a5b4fc",
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  label: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f9fafb",
  },
  error: {
    color: "#fecaca",
    marginTop: 10,
    fontSize: 13,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#4f46e5",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#f9fafb",
    fontSize: 16,
    fontWeight: "600",
  },
});