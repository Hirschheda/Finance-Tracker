import React from 'react';
import { useAuth } from "react-oidc-context";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import axios from "axios";

function App() {

  const auth = useAuth();

  const signOutRedirect = () => {
    const clientId = "2unrtdvdr3g1raepl4r614vc0r";
    const logoutUri = "<logout uri>";
    const cognitoDomain = "https://<user pool domain>";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const api = axios.create({
    baseURL: "https://jt23dkziya.execute-api.us-east-2.amazonaws.com/",
  });

  if (auth.isAuthenticated) {
    api.interceptors.request.use((config) => {
      const token = auth.user?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  if (auth.isLoading) return <div>Loading...</div>;
  if (auth.error) return <div>Error: {auth.error.message}</div>;

  return (
    <Router>
      <div className="p-4">
        {auth.isAuthenticated ? (
          <>
            <p>Welcome, {auth.user?.profile.fullname || auth.user?.profile.email}</p>
            <button onClick={() => auth.removeUser()& signOutRedirect()}  className="bg-red-500 text-white px-4 py-2">Sign Out</button>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              {auth.isAuthenticated ? (
                <Route path="/transactions" element={<Transactions />} />
              ) : (
                <Route path="/transactions" element={<Navigate to="/" replace />} />
              )}
            </Routes>
          </>
        ) : (
          <>
            <p>You are not signed in.</p>
            <button onClick={() => auth.signinRedirect()} className="bg-blue-600 text-white px-4 py-2">Sign In</button>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;