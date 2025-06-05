import React from 'react';
import 'antd/dist/reset.css';
import { useAuth } from "react-oidc-context";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import axios from "axios";

function App() {

  const auth = useAuth();

  const api = axios.create({
    baseURL: "insert api url here",
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