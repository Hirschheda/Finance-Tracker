import { useState } from "react";
import { useAuth } from "react-oidc-context";

export default function Login() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await auth.signinRedirect();
    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome Back</h1>
        <p className="text-gray-600 mb-8">Sign in to access your finance dashboard</p>
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-lg font-medium transition disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Sign in with Cognito"}
        </button>
      </div>
    </div>
  );
}