import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface AuthPageProps {
  onLogin: (user: any, accessToken: string) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    adminSecret: "",
  });

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(studentForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // Now log in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: studentForm.email,
        password: studentForm.password,
      });

      if (signInError) throw signInError;

      onLogin(data.user, signInData.session!.access_token);
    } catch (err: any) {
      setError(err.message);
      console.error("Student signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/admin/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(adminForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Admin signup failed");
      }

      // Now log in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: adminForm.email,
        password: adminForm.password,
      });

      if (signInError) throw signInError;

      onLogin(data.user, signInData.session!.access_token);
    } catch (err: any) {
      setError(err.message);
      console.error("Admin signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (signInError) throw signInError;

      // Get user profile
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/user`,
        {
          headers: {
            Authorization: `Bearer ${signInData.session!.access_token}`,
          },
        }
      );

      const userData = await response.json();

      if (!response.ok) {
        throw new Error(userData.error || "Failed to get user profile");
      }

      onLogin(userData.user, signInData.session!.access_token);
    } catch (err: any) {
      setError(err.message);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GraduationCap className="size-16 text-indigo-600" />
          </div>
          <h1 className="text-indigo-900 mb-2">Learning Management System</h1>
          <p className="text-gray-600">Access your courses and learning materials</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="student">Student Signup</TabsTrigger>
            <TabsTrigger value="admin">Admin Signup</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  {error && <p className="text-red-600">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="student">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="size-5" />
                  Student Signup
                </CardTitle>
                <CardDescription>Create a new student account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStudentSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Full Name</Label>
                    <Input
                      id="student-name"
                      type="text"
                      placeholder="John Doe"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-email">Email</Label>
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-password">Password</Label>
                    <Input
                      id="student-password"
                      type="password"
                      value={studentForm.password}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, password: e.target.value })
                      }
                      required
                    />
                  </div>
                  {error && <p className="text-red-600">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Student Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5" />
                  Admin Signup
                </CardTitle>
                <CardDescription>Create a new admin account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <Input
                      id="admin-name"
                      type="text"
                      placeholder="Jane Smith"
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-secret">Admin Secret</Label>
                    <Input
                      id="admin-secret"
                      type="password"
                      placeholder="Enter admin secret (hint: admin123)"
                      value={adminForm.adminSecret}
                      onChange={(e) =>
                        setAdminForm({ ...adminForm, adminSecret: e.target.value })
                      }
                      required
                    />
                  </div>
                  {error && <p className="text-red-600">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Admin Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}