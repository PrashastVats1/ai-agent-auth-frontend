import { useEffect, useState } from "react";
import type { User } from "oidc-client-ts";
import { userManager } from "../auth";
import { apiFetch } from "../api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userManager.getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    const onUserLoaded = (u: User) => setUser(u);
    const onUserUnloaded = () => setUser(null);
    userManager.events.addUserLoaded(onUserLoaded);
    userManager.events.addUserUnloaded(onUserUnloaded);
    return () => {
      userManager.events.removeUserLoaded(onUserLoaded);
      userManager.events.removeUserUnloaded(onUserUnloaded);
    };
  }, []);

  const login = () => userManager.signinRedirect();
  const logout = () => userManager.signoutRedirect({ post_logout_redirect_uri: "http://localhost:5173" });

  return { user, loading, login, logout };
}

export async function syncUser(): Promise<void> {
  await apiFetch("/api/users/sync", { method: "POST" });
}
