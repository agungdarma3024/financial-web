"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Loader2, TrendingDown, TrendingUp, Search, Calendar as CalendarIcon, Filter, FileSpreadsheet, ImageIcon, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import ProtectedRoute from "@/components/ProtectedRoute";
import { EventContext } from "../context/EventContext";

const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

export default function HistoryPage() {
  const router = useRouter();
  const { activeEvent } = useContext(EventContext);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  // State khusus untuk melihat foto struk
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeEvent) {
      router.push("/events");
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const catRes = await axios.get(`http://localhost:8000/api/categories/${activeEvent.id}`, { headers });
        const categories = catRes.data;
        const categoryMap = categories.reduce((acc: any, cat: any) => {
          acc[cat.id] = cat.name;
          return acc;
        }, {});

        const expRes = await axios.get(`http://localhost:8000/api/expenses/${activeEvent.id}`, { headers });
        const expenses = expRes.data.map((exp: any) => ({
          ...exp,
          type: 'expense',
          categoryName: categoryMap[exp.category_id] || 'Kategori Dihapus',
          timestamp: new Date(exp.created_at).getTime()
        }));

        const incRes = await axios.get(`http://localhost:8000/api/incomes/${activeEvent.id}`, { headers });
        const incomes = incRes.data.map((inc: any) => ({
          ...inc,
          type: 'income',
          timestamp: new Date(inc.created_at).getTime()
        }));

        const combined = [...expenses, ...incomes].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA === dateB) return b.timestamp - a.timestamp;
          return dateB - dateA;
        });

        setTransactions(combined);
      } catch (error) {
        console.error("Gagal mengambil riwayat transaksi", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [activeEvent, router]);

  const handleExportExcel = async () => {
    if (!activeEvent) return;
    setDownloading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/export/${activeEvent.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_${activeEvent.name.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Gagal mengunduh laporan Excel");
    } finally {
      setDownloading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchTab = activeTab === 'all' || t.type === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      t.description.toLowerCase().includes(searchLower) || 
      (t.type === 'expense' ? t.categoryName.toLowerCase().includes(searchLower) : (t.source || "").toLowerCase().includes(searchLower));
    
    return matchTab && matchSearch;
  });

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in pb-20">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-xl hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Riwayat Transaksi</h1>
              <p className="text-sm text-slate-500">{activeEvent?.name}</p>
            </div>
          </div>
          <Button onClick={handleExportExcel} disabled={downloading} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11">
            {downloading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileSpreadsheet className="w-5 h-5 mr-2" />}
            {downloading ? "Memproses..." : "Export Excel"}
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Cari transaksi, keterangan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-2xl bg-white border-slate-200 focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex p-1 bg-slate-200/50 rounded-xl">
            <button onClick={() => setActiveTab('all')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
            <button onClick={() => setActiveTab('income')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pemasukan</button>
            <button onClick={() => setActiveTab('expense')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'expense' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pengeluaran</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-3xl border border-slate-100 border-dashed">
            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Tidak ada transaksi ditemukan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((trx, index) => {
              const showDate = index === 0 || trx.date !== filteredTransactions[index - 1].date;
              return (
                <div key={trx.id}>
                  {showDate && (
                    <div className="flex items-center gap-2 mb-2 mt-4 ml-1">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{formatDate(trx.date)}</p>
                    </div>
                  )}
                  <Card className="border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${trx.type === 'expense' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                            {trx.type === 'expense' ? <TrendingDown className="w-5 h-5 text-orange-600" /> : <TrendingUp className="w-5 h-5 text-emerald-600" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{trx.description}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {trx.type === 'expense' ? `Keluar: ${trx.categoryName}` : `Masuk: ${trx.source}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${trx.type === 'expense' ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {trx.type === 'expense' ? '-' : '+'}{formatRupiah(trx.amount)}
                          </p>
                        </div>
                      </div>
                      
                      {/* TOMBOL LIHAT BUKTI FOTO (Jika ada receipt_url) */}
                      {trx.receipt_url && (
                        <div className="mt-3 ml-14">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs font-semibold rounded-lg h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => setSelectedImage(`http://localhost:8000${trx.receipt_url}`)}
                          >
                            <ImageIcon className="w-3 h-3 mr-2" /> Lihat Bukti
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* DIALOG UNTUK MENAMPILKAN FOTO BESAR */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-4 bg-slate-50 border-0">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-slate-800">Bukti Transaksi</DialogTitle>
            </DialogHeader>
            <div className="relative mt-2 rounded-2xl overflow-hidden bg-slate-200 min-h-[300px] flex items-center justify-center">
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Bukti Struk" 
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              )}
            </div>
            <Button onClick={() => setSelectedImage(null)} className="w-full mt-2 rounded-xl bg-slate-800 text-white">Tutup</Button>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}