"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Loader2, TrendingDown, TrendingUp, Calendar as CalendarIcon, FileText, Tag, Wallet, Camera } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import ProtectedRoute from "@/components/ProtectedRoute";
import { EventContext } from "../context/EventContext";

export default function TransactionPage() {
  const router = useRouter();
  const { activeEvent } = useContext(EventContext);
  
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [source, setSource] = useState("");
  
  // State baru khusus untuk file foto struk
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeEvent) {
      router.push("/events");
      return;
    }

    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`http://localhost:8000/api/categories/${activeEvent.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(response.data);
        if (response.data.length > 0) {
          setCategoryId(response.data[0].id);
        }
      } catch (error) {
        console.error("Gagal mengambil kategori", error);
      }
    };

    fetchCategories();
  }, [activeEvent, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) return alert("Masukkan nominal yang valid");
    if (!description) return alert("Masukkan deskripsi");
    if (type === 'expense' && !categoryId) return alert("Pilih kategori anggaran");
    if (type === 'income' && !source) return alert("Masukkan sumber dana");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Karena kita mau kirim file gambar, kita tidak pakai JSON biasa, tapi FormData
      const formData = new FormData();
      formData.append("event_id", activeEvent!.id);
      formData.append("amount", amount.replace(/\D/g, ''));
      formData.append("description", description);
      formData.append("date", date);
      
      // Kalau ada foto yang di-upload, masukkan ke dalam paket data
      if (receipt) {
        formData.append("receipt", receipt);
      }

      if (type === 'expense') {
        formData.append("category_id", categoryId);
        await axios.post("http://localhost:8000/api/expenses", formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
      } else {
        formData.append("source", source);
        await axios.post("http://localhost:8000/api/incomes", formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
      }

      alert("Transaksi berhasil dicatat!");
      router.push("/"); 
    } catch (error) {
      alert("Gagal menyimpan transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in">
        
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-xl hover:bg-slate-200 bg-white shadow-sm">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Catat Transaksi</h1>
            <p className="text-sm text-slate-500">Kegiatan: <span className="font-semibold">{activeEvent?.name}</span></p>
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-0">
            
            <div className="flex p-2 bg-slate-100/50 border-b border-slate-100">
              <button 
                onClick={() => setType('expense')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-2xl transition-all ${type === 'expense' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <TrendingDown className="w-4 h-4" /> Pengeluaran
              </button>
              <button 
                onClick={() => setType('income')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-2xl transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <TrendingUp className="w-4 h-4" /> Pemasukan
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              
              <div className="space-y-2">
                <Label className="text-slate-500 font-semibold">Nominal (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                    className="pl-14 h-16 rounded-2xl text-3xl font-bold text-slate-800 focus-visible:ring-blue-500 border-slate-200 bg-slate-50"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 font-semibold flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Tanggal Transaksi</Label>
                <Input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-14 rounded-xl focus-visible:ring-blue-500 border-slate-200"
                  required
                />
              </div>

              {type === 'expense' && (
                <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                  <Label className="text-slate-500 font-semibold flex items-center gap-2"><Tag className="w-4 h-4" /> Kategori Pagu</Label>
                  <select 
                    value={categoryId} 
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex h-14 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Pilih Kategori...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} (Sisa Pagu: Rp {(cat.allocated_amount - cat.spent_amount).toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>
              )}

              {type === 'income' && (
                <div className="space-y-2 animate-in slide-in-from-right-2 duration-300">
                  <Label className="text-slate-500 font-semibold flex items-center gap-2"><Wallet className="w-4 h-4" /> Sumber Dana</Label>
                  <Input 
                    type="text" 
                    placeholder="Contoh: Tambahan dari Donatur..."
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="h-14 rounded-xl focus-visible:ring-emerald-500 border-slate-200"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-500 font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Keterangan</Label>
                <Input 
                  type="text" 
                  placeholder="Beli tiket kereta, Beli nasi kotak..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-14 rounded-xl focus-visible:ring-blue-500 border-slate-200"
                  required
                />
              </div>

              {/* KOLOM UPLOAD FOTO BARU */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <Label className="text-slate-600 font-semibold flex items-center gap-2 mb-2"><Camera className="w-4 h-4" /> Upload Bukti Struk (Opsional)</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  className="bg-white rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer h-12 pt-2"
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className={`w-full h-14 rounded-xl text-white font-bold text-lg shadow-md transition-all active:scale-[0.98] ${type === 'expense' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/25' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'}`}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Simpan ${type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}`}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

      </div>
    </ProtectedRoute>
  );
}