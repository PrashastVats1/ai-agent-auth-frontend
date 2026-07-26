import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userManager } from "../auth";
import { syncUser } from "../hooks/useAuth";

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    userManager.signinRedirectCallback().then(async () => {
      await syncUser().catch(() => {}); // create user row in Neon on first login
      navigate("/");
    });
  }, [navigate]);

  return <div className="flex items-center justify-center h-screen text-gray-500">Signing in...</div>;
}
