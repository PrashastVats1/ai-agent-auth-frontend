import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-lg">AI Agent Auth</span>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.profile.email}</span>
            <button onClick={logout} className="text-sm text-gray-500 hover:underline">
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 text-sm"
          >
            Sign in
          </button>
        )}
      </nav>

      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route
          path="/"
          element={user ? <Dashboard /> : (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
              <h1 className="text-2xl font-semibold">Agent Identity & Delegation</h1>
              <p className="text-gray-500 max-w-md text-center">
                Sign in to manage your agents, set access policies, approve consent requests, and view the audit log.
              </p>
              <button
                onClick={login}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Sign in with MonoCloud
              </button>
            </div>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
