// expo/context/AuthContext.tsx
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Dev token so recipes work before real login
  const [token, setToken] = useState<string | null>(
    __DEV__
      ? "CREATE OWN JWT TOKEN"
      : null
  );
  const [loading, setLoading] = useState(true);

  // For now, just mark loading false on mount (no persistence)
  useEffect(() => {
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // This is the standard place you'd call your real /login route.
    // For now you can just mock it or keep this for later.
    const res = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }

    const data = await res.json(); // expects { access_token: "..." }
    const newToken = data.access_token;
    setToken(newToken);
  };

  const logout = async () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);