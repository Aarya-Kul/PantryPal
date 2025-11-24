// context/AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const TOKEN_STORAGE_KEY = "auth_token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore token on app launch
  useEffect(() => {
    const restoreToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (e) {
        console.warn("Failed to restore token", e);
      } finally {
        setLoading(false);
      }
    };

    restoreToken();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("http://127.0.0.1:8000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }

    const data = await res.json();
    const newToken = data.access_token as string;

    if (!newToken) {
      throw new Error("No access token returned from server");
    }

    setToken(newToken);
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);
  };

  const logout = async () => {
    setToken(null);
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear token", e);
    }
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);