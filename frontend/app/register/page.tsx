"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Pastikan port sesuai dengan backend-mu (8000)
      await axios.post("https://financial-web-pi.vercel.app/api/auth/register", {
        name: name,
        email: email,
        password: password
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err: any) {
      // --- BAGIAN INI YANG DIPERBAIKI ---
      const errorDetail = err.response?.data?.detail;

      // Jika FastAPI mengirim error berbentuk Array/Objek (Validasi Pydantic)
      if (Array.isArray(errorDetail)) {
        // Ambil teks pesannya saja (biasanya ada di dalam 'msg')
        setError(`Error input: ${errorDetail[0].msg}`);
      } 
      // Jika FastAPI mengirim error berupa teks biasa (HTTPException buatan kita)
      else if (typeof errorDetail === 'string') {
        setError(errorDetail);
      } 
      // Jika error lainnya (misal server mati)
      else {
        setError("Gagal mendaftar. Pastikan backend menyala dan isian benar.");
      }
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
          <h1 className="text-3xl font-bold text-slate-900">Buat Akun</h1>
          <p className="text-slate-500 mt-2">Daftar untuk mulai mengelola Dompet Lapangan</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-xl">Pendaftaran</CardTitle>
            <CardDescription>Gunakan email aktif untuk mendaftar</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {success ? (
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center space-y-3 animate-in zoom-in-95">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-emerald-800 font-bold">Akun Berhasil Dibuat!</p>
                  <p className="text-emerald-600 text-sm">Sedang mengalihkan ke halaman login...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-600 text-sm font-medium animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="break-words flex-1">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="Nama Anda" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                    className="h-12 rounded-xl focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nama@email.com" 
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
                    placeholder="Min. 6 karakter" 
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
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Daftar Sekarang"}
                </Button>

                <div className="text-center mt-6">
                  <p className="text-sm text-slate-500">
                    Sudah punya akun? <Link href="/login" className="text-blue-600 font-bold hover:underline">Masuk di sini</Link>
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}