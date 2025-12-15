import { useState, useEffect } from "react";
import { AuthPage } from "./components/AuthPage";
import { StudentDashboard } from "./components/StudentDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { supabase } from "./utils/supabase/client";
import { projectId } from "./utils/supabase/info";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Get user profile
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/user`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          setAccessToken(session.access_token);
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: any, token: string) => {
    setUser(userData);
    setAccessToken(token);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken("");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  if (user.role === "admin") {
    return (
      <>
        <AdminDashboard
          user={user}
          accessToken={accessToken}
          onLogout={handleLogout}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <StudentDashboard
        user={user}
        accessToken={accessToken}
        onLogout={handleLogout}
      />
      <Toaster />
    </>
  );
}