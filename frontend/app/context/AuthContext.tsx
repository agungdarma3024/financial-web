"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

// Mendefinisikan bentuk data User
interface User {
  name: string;
  email: string;
}

// Mendefinisikan bentuk "Ingatan" kita
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

// Membuat Context (Brankas Ingatan)
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

// Membuat Provider (Penjaga Brankas yang membagikan data ke semua halaman)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fungsi ini berjalan otomatis setiap kali web pertama kali dibuka/di-refresh
    const checkLoggedInUser = async () => {
      const token = localStorage.getItem("token");
      
      if (token) {
        try {
          // Tanya ke backend: "Halo, ini tokenku, aku siapa ya?"
          const response = await axios.get("https://financial-web-pi.vercel.app/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Jika backend membalas, simpan data usernya
          setUser(response.data);
        } catch (error) {
          // Jika token palsu atau kadaluarsa, buang tokennya
          localStorage.removeItem("token");
          setUser(null);
        }
      }
      setLoading(false); // Selesai loading
    };
    
    checkLoggedInUser();
  }, []);

  // Fungsi untuk Login (Menyimpan token & data, lalu pindah ke Dashboard)
  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    setUser(userData);
    router.push("/");
  };

  // Fungsi untuk Logout (Menghapus token & data, lalu balik ke halaman Login)
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};