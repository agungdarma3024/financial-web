"use client";

import React, { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "../app/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    // Kalau sudah selesai loading dan ternyata TIDAK ADA user, tendang ke login!
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Selama masih ngecek data ke backend, tampilkan loading muter-muter
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Memeriksa sesi...</p>
      </div>
    );
  }

  // Kalau tidak ada user, jangan tampilkan apa-apa (karena sedang proses ditendang ke /login)
  if (!user) {
    return null;
  }

  // Kalau aman (ada user), silakan masuk ke halaman yang dituju!
  return <>{children}</>;
}