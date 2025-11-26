// app/signup.tsx
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
    View,
} from "react-native";

const SignupScreen: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState(""); // optional, free text or YYYY-MM-DD
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    birthday?: string;
    password?: string;
  }>({});

  const validateForm = () => {
    const nextFieldErrors: typeof fieldErrors = {};

    if (!name.trim()) {
      nextFieldErrors.name = "Name is required.";
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!trimmedEmail) {
      nextFieldErrors.email = "Email is required.";
    } else if (!emailRegex.test(trimmedEmail)) {
      nextFieldErrors.email = "Please enter a valid email address.";
    }

    if (birthday.trim()) {
      const birthdayRegex = /^\d{4}-\d{2}-\d{2}$/; // simple YYYY-MM-DD check
      if (!birthdayRegex.test(birthday.trim())) {
        nextFieldErrors.birthday = "Use format YYYY-MM-DD (or leave blank).";
      }
    }

    if (!password) {
      nextFieldErrors.password = "Password is required.";
    } else if (password.length < 6) {
      nextFieldErrors.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length === 0;
  };

  const handleSignup = async () => {
    if (submitting) return;

    setError(null);

    const isValid = validateForm();
    if (!isValid) return;

    setSubmitting(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/sign_up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim(),
          password,
          birthday: birthday || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create account");
      }

      // immediately go back to login (no alert tap needed)
      setName("");
      setEmail("");
      setBirthday("");
      setPassword("");

      router.replace("/login");
    } catch (e: any) {
      setError(e.message ?? "Sign up failed. Please try again.");
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
        <Text style={styles.appTitle}>Create your account</Text>
        <Text style={styles.subtitle}>Join PantryPal</Text>

        <View style={styles.card}>
          {/* Top-level error (backend / network) */}
          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor="#777"
          />
          {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="off"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#777"
          />
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          <Text style={styles.label}>Birthday (optional)</Text>
          <TextInput
            style={styles.input}
            value={birthday}
            onChangeText={setBirthday}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#777"
          />
          {fieldErrors.birthday && (
            <Text style={styles.fieldError}>{fieldErrors.birthday}</Text>
          )}

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoComplete="off"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#777"
          />
          {fieldErrors.password && (
            <Text style={styles.fieldError}>{fieldErrors.password}</Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8 },
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleSignup}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign up</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.backToLogin}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.backText}>Already have an account? Log in</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default SignupScreen;

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
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
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
    marginBottom: 6,
    fontSize: 13,
  },
  fieldError: {
    color: "#fecaca",
    marginTop: 2,
    fontSize: 12,
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
  backToLogin: {
    marginTop: 14,
    alignItems: "center",
  },
  backText: {
    color: "#9ca3af",
    fontSize: 13,
  },
});