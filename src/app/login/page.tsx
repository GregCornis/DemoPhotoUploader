'use client'

import { useState } from "react";
import { login } from "./action";

async function openDB() {
  const db = await window.indexedDB.open("auth-db", 1);

  return new Promise<IDBDatabase>((resolve, reject) => {
    db.onupgradeneeded = () => {
      const store = db.result.createObjectStore("auth");
    };
    db.onsuccess = () => resolve(db.result);
    db.onerror = () => reject(db.error);
  });
};

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(formData: FormData) {
    const token = await login(email, password);
    const db = await openDB();
    const tx = db.transaction('auth', "readwrite");
    tx.objectStore("auth").put(token, "auth_token");
    
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(null);
      tx.onabort = () => reject();
      tx.onerror = (err) => reject(err);
    })
    
    console.log("Logged in", token);
    window.location.href = "/"
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        action={handleLogin}
        className="bg-white p-6 rounded-2xl shadow-md w-80 space-y-4"
      >
        <h2 className="text-xl font-semibold text-gray-800 text-center">Login</h2>

        <div>
          <label htmlFor="email" className="block text-sm text-gray-600 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-600 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-xl hover:bg-blue-600 transition"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}