import { UserManager } from "oidc-client-ts";

export const userManager = new UserManager({
  authority: import.meta.env.VITE_MONOCLOUD_ISSUER_URL,
  client_id: import.meta.env.VITE_MONOCLOUD_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_MONOCLOUD_REDIRECT_URI,
  scope: "openid profile email",
  response_type: "code",
});
