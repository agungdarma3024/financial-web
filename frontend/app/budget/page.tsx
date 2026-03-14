"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Plus, Loader2, PiggyBank, Pencil } from "lucide-react";

// --- IMPORT SHADCN UI ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import ProtectedRoute from "@/components/ProtectedRoute";
import { EventContext } from "../context/EventContext";

const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

export default function BudgetPage() {
  const router = useRouter();
  const { activeEvent } = useContext(EventContext);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Fungsi mengambil daftar pagu dari database
  const fetchCategories = async () => {
    if (!activeEvent) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:8000/api/categories/${activeEvent.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error("Gagal mengambil data pagu", error);
    } finally {
      setLoading(false);
    }
  };

  // Cek apakah ada kegiatan aktif saat halaman dibuka
  useEffect(() => {
    if (activeEvent) {
      fetchCategories();
    } else {
      router.push("/events"); // Kalau tidak ada, tendang ke halaman pilih kegiatan
    }
  }, [activeEvent]);

  // Fungsi menyimpan pagu baru
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return alert("Isi semua data!");
    
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:8000/api/categories", {
        event_id: activeEvent?.id,
        name: name,
        allocated_amount: parseInt(amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Kosongkan form setelah berhasil
      setName("");
      setAmount("");
      fetchCategories(); // Refresh list di sebelah kanan
    } catch (error) {
      alert("Gagal menyimpan pagu anggaran");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 animate-in fade-in">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-xl hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kelola Pagu Anggaran</h1>
            <p className="text-sm text-slate-500">Kegiatan: <span className="font-semibold">{activeEvent?.name}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* FORM TAMBAH PAGU (Kiri) */}
          <div className="md:col-span-5">
            <Card className="border-0 shadow-sm rounded-2xl md:sticky md:top-6">
              <CardHeader className="pb-4 border-b border-slate-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" /> Tambah Pagu Baru
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nama Kategori</Label>
                    <Input 
                      placeholder="Contoh: Konsumsi Peserta" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 rounded-xl focus-visible:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Jumlah Anggaran (Rp)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-12 h-12 rounded-xl text-lg font-bold focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2" disabled={saving}>
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Pagu"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* LIST PAGU TERSIMPAN (Kanan) */}
          <div className="md:col-span-7 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Daftar Pagu Tersimpan</h2>
            
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
            ) : categories.length === 0 ? (
              <div className="text-center p-10 bg-white rounded-2xl border border-slate-100 border-dashed">
                <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Belum ada pagu anggaran.</p>
                <p className="text-sm text-slate-400">Silakan tambah pagu pertama Anda di form sebelah kiri.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <Card key={cat.id} className="border border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{cat.name}</p>
                        <p className="text-sm font-bold text-blue-600 mt-1">{formatRupiah(cat.allocated_amount)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 rounded-lg bg-slate-50">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}