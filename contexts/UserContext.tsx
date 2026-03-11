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
  // pendingId: candidate from storage, not yet verified
  const [pendingId, setPendingId] = useState<string | null>(null);
  // verifiedId: confirmed to be a real users-table ID
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreate);

  // Only query once we have a pending candidate; undefined = still loading, null = not a user
  const user = useQuery(api.users.safeGet, pendingId ? { id: pendingId } : 'skip');

  // Step 1: load or create a candidate ID
  useEffect(() => {
    async function initUser() {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setPendingId(stored);
        } else {
          const id = await getOrCreate({});
          await AsyncStorage.setItem(USER_STORAGE_KEY, id);
          setPendingId(id);
        }
      } catch (error) {
        console.error('Failed to initialize user:', error);
      }
    }
    initUser();
  }, [getOrCreate]);

  // Step 2: once safeGet resolves, either confirm or replace the ID
  useEffect(() => {
    if (!pendingId) return;
    if (user === undefined) return; // still loading

    if (user !== null) {
      // Valid user document — expose it
      setVerifiedId(pendingId);
    } else {
      // Invalid/corrupt ID — create a fresh user
      async function resetUser() {
        try {
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          const id = await getOrCreate({});
          await AsyncStorage.setItem(USER_STORAGE_KEY, id);
          // Set pendingId to the new ID so safeGet re-runs and verifies it
          setPendingId(id);
        } catch (error) {
          console.error('Failed to reset user:', error);
        }
      }
      resetUser();
    }
  }, [pendingId, user, getOrCreate]);

  const role = (user as any)?.role ?? null;

  return (
    <UserContext.Provider value={{ userId: verifiedId, role }}>
      {children}
    </UserContext.Provider>
  );
}
