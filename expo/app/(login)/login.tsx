// app/(login)/login.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import logo from "../../assets/images/logo.png";
import AiTransparencyModal from "../../components/AiTransparencyModal";
import { useAuth } from "../../context/AuthContext";

const AI_KEY_PREFIX = "ai_disclosure_accepted_";

const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For AI modal gating
  const [showAiModal, setShowAiModal] = useState(false);
  const [currentAiKey, setCurrentAiKey] = useState<string | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;

    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (!trimmedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    const aiKey = `${AI_KEY_PREFIX}${trimmedEmail}`;

    try {
      const accepted = await AsyncStorage.getItem(aiKey);

      if (accepted === "true") {
        // Already accepted → normal login flow
        setSubmitting(true);
        try {
          await login(trimmedEmail, password);
          // Protected layout handles navigation
        } catch (e: any) {
          setError(e?.message ?? "Login failed. Please try again.");
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // Not accepted yet → store credentials & show modal, do NOT touch submitting
      setPendingLogin({ email: trimmedEmail, password });
      setCurrentAiKey(aiKey);
      setShowAiModal(true);
      return;
    } catch (e) {
      console.error("Error checking AI acceptance:", e);
      setError("Something went wrong checking AI acceptance. Please try again.");
      return;
    }
  };

  const handleAcceptAi = async () => {
    // Defensive: if we somehow lost state, just close the modal
    if (!currentAiKey || !pendingLogin) {
      setShowAiModal(false);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Persist acceptance for this user
      await AsyncStorage.setItem(currentAiKey, "true");
      // Optional: ensure pending gets flushed before next getItem on some platforms
      // @ts-expect-error: flushGetRequests may not exist on all platforms
      await AsyncStorage.flushGetRequests?.();

      // Now perform the login once
      await login(pendingLogin.email, pendingLogin.password);
      // Navigation handled by auth-protected layout
    } catch (e: any) {
      console.error("Error during login after AI acceptance:", e);
      setError(e?.message ?? "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
      setShowAiModal(false);
      setPendingLogin(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      {/* AI Transparency Modal – opens when this user hasn't accepted yet */}
      <AiTransparencyModal visible={showAiModal} onAccept={handleAcceptAi} />

      <View style={styles.inner}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appTitle}>PantryPal</Text>

        <View style={styles.card}>
          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="off"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#777"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoComplete="off"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#777"
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8 },
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log in</Text>
            )}
          </Pressable>

          {/* Example creds hint */}
          <Text style={styles.hint}>
            Postman example login:
            {"\n"}Email: testuser123@gmail.com
            {"\n"}Password: abc123
          </Text>

          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push("/signup")}>
              <Text style={styles.linkText}>Create an account</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/forgot-password")}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

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
  appTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 30,
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
    marginBottom: 8,
    fontSize: 13,
  },
  button: {
    marginTop: 16,
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
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
  linkRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkText: {
    fontSize: 13,
    color: "#a5b4fc",
    fontWeight: "500",
  },
  logo: {
    width: 110,
    height: 110,
    alignSelf: "center",
    marginBottom: 16,
  },
});