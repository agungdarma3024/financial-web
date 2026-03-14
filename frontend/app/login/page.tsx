"use client";

import React, { useState, useContext } from "react";
import axios from "axios";
import { Wallet, Loader2, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Import AuthContext yang sudah kita buat
import { AuthContext } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useContext(AuthContext); // Ambil fungsi login dari brankas ingatan
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Tembak API Login (pastikan port 8000)
      const response = await axios.post("https://financial-web-xi.vercel.app/api/auth/login", {
        email: email,
        password: password
      });

      // Panggil fungsi login dari AuthContext (Otomatis simpan token & pindah ke Dashboard)
      login(response.data.access_token, response.data.user);

    } catch (err: any) {
      setError(err.response?.data?.detail || "Gagal masuk. Periksa kembali email dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Dompet Lapangan</h1>
          <p className="text-slate-500 mt-2">Masuk untuk mengelola keuangan acara</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-xl">Login Akun</CardTitle>
            <CardDescription>Masukkan email dan kata sandi Anda</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-600 text-sm font-medium animate-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="break-words flex-1">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="koordinator@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="h-12 rounded-xl focus-visible:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="h-12 rounded-xl focus-visible:ring-blue-500"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-4 transition-all active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}