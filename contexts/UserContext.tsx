import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { createContext, useContext } from "react";

export type UserRole = "patient" | "admin";
export type AdminStatus = "pending" | "approved" | "rejected" | undefined;

export interface UserRecord {
  _id: Id<"users">;
  name?: string;
  email?: string;
  role?: string;
  adminStatus?: AdminStatus;
  pushToken?: string;
  createdAt?: number;
}

interface UserContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserRecord | null;
  userId: Id<"users"> | null;
  role: UserRole | null;
  adminStatus: AdminStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: "patient" | "admin",
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  userId: null,
  role: null,
  adminStatus: undefined,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  const user = useQuery(api.users.getMe, isAuthenticated ? {} : "skip") as
    | UserRecord
    | null
    | undefined;

  const isLoading = authLoading || (isAuthenticated && user === undefined);

  const signIn = async (email: string, password: string) => {
    await convexSignIn("password", { email, password, flow: "signIn" });
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "patient" | "admin",
  ) => {
    await convexSignIn("password", {
      email,
      password,
      flow: "signUp",
      name,
      role,
    });
  };

  const signOut = async () => {
    try {
      await convexSignOut();
    } catch {}
    try {
      if (typeof localStorage !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("convex"))
          .forEach((k) => localStorage.removeItem(k));
      }
    } catch {}
    router.replace("/(auth)/login");
  };

  const userId = (user?._id ?? null) as Id<"users"> | null;
  const role = (user?.role as UserRole) ?? null;
  const adminStatus = user?.adminStatus;

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user: user ?? null,
        userId,
        role,
        adminStatus,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useAuth() {
  return useContext(UserContext);
}
export function useUser() {
  return useContext(UserContext).userId as string | null;
}
export function useUserRole() {
  return useContext(UserContext).role;
}
