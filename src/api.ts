import { userManager } from "./auth";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const user = await userManager.getUser();
  if (!user) throw new Error("Not authenticated");

  return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${user.access_token}`,
      "Content-Type": "application/json",
    },
  });
}
