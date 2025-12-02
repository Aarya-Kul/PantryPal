// config/api.ts
import Constants from "expo-constants";
import { Platform } from "react-native";

function getDevBaseUrl() {
  // hostUri looks like "172.25.127.209:8081" or "192.168.0.5:8081"
  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    // Fallbacks for web / emulator if hostUri is missing
    if (Platform.OS === "web") {
      return "http://localhost:8000";
    }
    // You could also throw here to force yourself to configure it
    return "http://10.0.2.2:8000"; // Android emulator default to host
  }

  const [host] = hostUri.split(":"); // "172.25.127.209"
  return `http://${host}:8000`; // your backend port
}

export const API_BASE_URL = __DEV__
  ? getDevBaseUrl()
  : "https://pantrypal-4nnr.onrender.com"; // change for prod