import { createContext, useContext, useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'mediscan_user_id';

interface UserContextValue {
  userId: string | null;
  role: string | null;
}

const UserContext = createContext<UserContextValue>({ userId: null, role: null });

export function useUser() {
  return useContext(UserContext).userId;
}

export function useUserRole() {
  return useContext(UserContext).role;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreate);
  const user = useQuery(api.users.get, userId ? { id: userId as any } : "skip");

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

  const role = user?.role ?? null;

  return (
    <UserContext.Provider value={{ userId, role }}>
      {children}
    </UserContext.Provider>
  );
}
