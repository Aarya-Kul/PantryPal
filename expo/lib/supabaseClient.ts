import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

export const supabase = createClient(
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL!,
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);