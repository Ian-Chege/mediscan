import { createContext, useContext, useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'mediscan_user_id';

const UserContext = createContext<string | null>(null);

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreate);

  useEffect(() => {
    async function initUser() {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setUserId(stored);
          return;
        }

        const id = await getOrCreate({});
        await AsyncStorage.setItem(USER_STORAGE_KEY, id);
        setUserId(id);
      } catch (error) {
        console.error('Failed to initialize user:', error);
      }
    }
    initUser();
  }, [getOrCreate]);

  return (
    <UserContext.Provider value={userId}>
      {children}
    </UserContext.Provider>
  );
}
