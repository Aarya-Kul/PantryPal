// app/forgot-password.tsx
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { API_BASE_URL } from "../../config/api";

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleReset = async () => {
    if (submitting) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/forgot_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send reset instructions");
      }

      setSuccessMsg(
        "If an account exists for this email, a reset link has been sent."
      );
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we’ll send you instructions to reset your
          password.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#777"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {successMsg && <Text style={styles.success}>{successMsg}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8 },
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleReset}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send reset link</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>Back to login</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;

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
  success: {
    color: "#bbf7d0",
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
  backLink: {
    marginTop: 14,
    alignItems: "center",
  },
  backText: {
    color: "#9ca3af",
    fontSize: 13,
  },
});