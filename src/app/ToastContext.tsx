'use client'

import React, { createContext, useContext, useState } from "react";

interface ToastMessage {
  id: number
  type: string
  message: string
}
const ToastContext = createContext({ showToast: (m:string, t?: string) => { } });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type = "error") => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);

    // Auto-remove after a moment
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 10000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>

      {children}

      {/* Render all active toasts */}
      <div className="fixed bottom-4 flex justify-center w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-white ${toast.type === "error" ? "bg-red-700" : "bg-green-500"
              }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext);
}
