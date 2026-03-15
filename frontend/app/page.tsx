"use client";

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  Wallet, PiggyBank, TrendingDown, TrendingUp, AlertTriangle, 
  Loader2, Bell, X, Pencil, Plus, LogOut, User as UserIcon, CalendarDays
} from 'lucide-react';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthContext } from './context/AuthContext';
import { EventContext } from './context/EventContext';

const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
const calculatePercentage = (spent: number, allocated: number) => allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
const isOverbudget = (spent: number, allocated: number) => spent > allocated;

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);
  const { activeEvent, setActiveEvent } = useContext(EventContext);

  const [categories, setCategories] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  
  // State Edit Pagu Kategori 
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [savingEdit, setSavingEdit] = useState(false); // Loading untuk simpan pagu
  
  // State Edit Modal Awal
  const [editCashDialogOpen, setEditCashDialogOpen] = useState(false);
  const [newCashAmount, setNewCashAmount] = useState('');
  const [savingCash, setSavingCash] = useState(false);

  const fetchDashboardData = async () => {
    if (!activeEvent) return;
    setLoadingData(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const catRes = await axios.get(`https://financial-web-pi.vercel.app/api/categories/${activeEvent.id}`, { headers });
      setCategories(catRes.data);

      const incRes = await axios.get(`https://financial-web-pi.vercel.app/api/incomes/${activeEvent.id}`, { headers });
      setIncomes(incRes.data);

    } catch (error) {
      console.error("Gagal mengambil data dashboard", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeEvent]);

  const initialCash = activeEvent?.initial_cash || 0;
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const calculatedTotalSpent = categories.reduce((sum, cat) => sum + cat.spent_amount, 0); 
  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
  const remainingCash = initialCash + totalIncome - calculatedTotalSpent;
  const remainingBudget = totalAllocated - calculatedTotalSpent;

  // FUNGSI SIMPAN MODAL AWAL
  const handleSaveCash = async () => {
    if (!newCashAmount || parseInt(newCashAmount) < 0) return alert("Masukkan nominal yang valid");
    setSavingCash(true);
    try {
      const token = localStorage.getItem("token");
      const nominal = parseInt(newCashAmount);
      
      await axios.put(`https://financial-web-pi.vercel.app/api/events/${activeEvent!.id}/cash`, 
        { initial_cash: nominal }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedEvent = { ...activeEvent!, initial_cash: nominal };
      setActiveEvent(updatedEvent);
      
      setEditCashDialogOpen(false);
      alert("Modal Awal berhasil diperbarui!");
    } catch (error) {
      alert("Gagal memperbarui modal awal");
    } finally {
      setSavingCash(false);
    }
  };

  const dismissAlert = (categoryId: number) => setDismissedAlerts(prev => [...prev, categoryId]);
  
  const openEditDialog = (category: any) => {
    setEditingCategory(category);
    setEditAmount(category.allocated_amount.toString());
    setEditDialogOpen(true);
  };

  // FUNGSI BARU: SIMPAN EDIT PAGU ANGGARAN KATEGORI
  const handleSaveEdit = async () => {
    if (!editAmount || parseInt(editAmount) <= 0) return alert('Masukkan nominal yang valid');
    setSavingEdit(true);
    try {
      const token = localStorage.getItem("token");
      const nominal = parseInt(editAmount);

      await axios.put(`https://financial-web-pi.vercel.app/api/categories/${editingCategory.id}`,
        { allocated_amount: nominal },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditDialogOpen(false);
      fetchDashboardData(); // Refresh data kategori dari database
      alert("Pagu berhasil diperbarui!");
    } catch (error) {
      alert("Gagal memperbarui pagu");
    } finally {
      setSavingEdit(false);
    }
  };

  const overbudgetCategories = categories.filter((cat) => isOverbudget(cat.spent_amount, cat.allocated_amount) && !dismissedAlerts.includes(cat.id));

  if (!activeEvent) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
          <CalendarDays className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Belum Ada Kegiatan Aktif</h2>
          <Button onClick={() => router.push('/events')} className="bg-blue-600 rounded-xl h-12 px-6">Lihat Daftar Kegiatan</Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 animate-in fade-in pb-20">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full"><UserIcon className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Selamat datang,</p>
              <p className="text-base font-bold text-slate-800">{user?.name || "Pengguna"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-0 pt-4 md:pt-0 border-slate-100">
            <Link href="/history" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors text-sm font-bold">Lihat Riwayat</Link>
            <Link href="/events" className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm font-medium text-slate-700"><CalendarDays className="w-4 h-4" /> Ganti</Link>
            <Button variant="ghost" size="icon" onClick={logout} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-10 w-10 rounded-xl"><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>

        {overbudgetCategories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overbudgetCategories.map((cat) => {
              const excess = cat.spent_amount - cat.allocated_amount;
              return (
                <div key={cat.id} className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="p-2 bg-red-100 rounded-xl"><Bell className="w-5 h-5 text-red-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-700">{cat.name} Melebihi Pagu!</p>
                    <p className="text-xs text-red-500">Lebih {formatRupiah(excess)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => dismissAlert(cat.id)} className="hover:bg-red-100 h-8 w-8 rounded-full"><X className="w-4 h-4 text-red-500" /></Button>
                </div>
              );
            })}
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">Kegiatan Aktif</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 truncate">{activeEvent.name}</h1>
        </div>

        {loadingData ? (
          <div className="h-64 flex items-center justify-center bg-white rounded-3xl border border-slate-100"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            
            <Card className="md:col-span-8 relative overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25 rounded-3xl">
              <CardContent className="p-6 md:p-8 h-full flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm md:text-base font-medium mb-2">Sisa Uang di Tangan</p>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight">{formatRupiah(remainingCash)}</p>
                    
                    <div className="flex gap-2 mt-4 flex-wrap items-center">
                      <div className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-full border border-white/10 flex items-center gap-2">
                        <p className="text-xs font-medium">Modal: {formatRupiah(initialCash)}</p>
                        <button 
                          onClick={() => { setNewCashAmount(initialCash.toString()); setEditCashDialogOpen(true); }}
                          className="bg-white/20 hover:bg-white/40 p-1 rounded-full transition-colors"
                        >
                          <Pencil className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      
                      {totalIncome > 0 && (
                        <div className="px-3 py-1.5 bg-emerald-400/30 backdrop-blur rounded-full border border-emerald-400/20 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-100" />
                          <p className="text-xs font-medium text-emerald-50">Masuk: {formatRupiah(totalIncome)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex p-6 bg-white/10 backdrop-blur-sm rounded-3xl"><Wallet className="w-12 h-12 text-blue-50" /></div>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-4 flex flex-col gap-4 md:gap-6">
              <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm rounded-2xl flex-1">
                <CardContent className="p-5 flex items-center justify-between h-full">
                  <div>
                    <p className="text-sm font-medium text-emerald-700 mb-1">Sisa Pagu</p>
                    <p className="text-2xl font-bold text-emerald-900">{formatRupiah(remainingBudget)}</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-2xl"><PiggyBank className="w-6 h-6 text-emerald-600" /></div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm rounded-2xl flex-1">
                <CardContent className="p-5 flex items-center justify-between h-full">
                  <div>
                    <p className="text-sm font-medium text-orange-700 mb-1">Total Pengeluaran</p>
                    <p className="text-2xl font-bold text-orange-900">{formatRupiah(calculatedTotalSpent)}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-2xl"><TrendingDown className="w-6 h-6 text-orange-600" /></div>
                </CardContent>
              </Card>
            </div>

          </div>
        )}

        {!loadingData && categories.length > 0 && (
          <div className="flex gap-4">
            <Link href="/transaction" className="flex-1">
              <Button className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white shadow-lg flex items-center justify-center gap-2 text-base font-bold transition-transform active:scale-95">
                <Plus className="w-5 h-5" /> Catat Transaksi Baru
              </Button>
            </Link>
          </div>
        )}

        {!loadingData && (
          <div className="pt-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Pagu Anggaran Kategori</h2>
              <Link href="/budget" className="flex items-center gap-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-200 transition-colors">
                <Plus className="w-4 h-4" /> Tambah Pagu
              </Link>
            </div>

            {categories.length === 0 ? (
              <div className="text-center p-10 bg-white rounded-2xl border border-slate-100 border-dashed">
                <p className="text-slate-500 font-medium">Belum ada pagu anggaran.</p>
                <Link href="/budget"><Button variant="outline" className="rounded-xl mt-4">Mulai Atur Pagu</Button></Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const percentage = calculatePercentage(category.spent_amount, category.allocated_amount);
                  const overbudget = isOverbudget(category.spent_amount, category.allocated_amount);
                  return (
                    <Card key={category.id} className={`border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl ${overbudget ? 'bg-gradient-to-br from-red-50 to-orange-50 ring-1 ring-red-200' : 'bg-white'}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`font-bold text-lg ${overbudget ? 'text-red-700' : 'text-slate-800'}`}>{category.name}</p>
                              {overbudget && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center gap-1"><AlertTriangle size={10}/></span>}
                            </div>
                            <p className={`text-sm ${overbudget ? 'text-red-500 font-medium' : 'text-slate-500'}`}>Terpakai: {formatRupiah(category.spent_amount)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400 font-medium mb-1">Anggaran</p>
                            <p className={`text-sm font-bold ${overbudget ? 'text-red-600' : 'text-slate-700'}`}>{formatRupiah(category.allocated_amount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={Math.min(percentage, 100)} className={`h-2.5 flex-1 ${overbudget ? 'bg-red-200 [&>div]:bg-red-500' : 'bg-slate-100 [&>div]:bg-blue-500'}`} />
                          <span className={`text-xs font-bold ${overbudget ? 'text-red-600' : 'text-slate-500'}`}>{percentage}%</span>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(category)} className="h-8 rounded-lg text-xs font-medium border-slate-200 hover:bg-slate-50">
                            <Pencil className="w-3 h-3 mr-1" /> Edit Pagu
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DIALOG EDIT MODAL AWAL (Kantong Utama) */}
        <Dialog open={editCashDialogOpen} onOpenChange={setEditCashDialogOpen}>
          <DialogContent className="sm:max-w-md w-[90%] rounded-2xl bg-white border-0">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Uang Modal Awal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Jumlah Modal (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newCashAmount ? parseInt(newCashAmount).toLocaleString('id-ID') : ''}
                    onChange={(e) => setNewCashAmount(e.target.value.replace(/\D/g, ''))}
                    className="pl-12 h-14 text-lg font-bold rounded-xl focus-visible:ring-blue-500 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setEditCashDialogOpen(false)}>Batal</Button>
                <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={handleSaveCash} disabled={savingCash}>
                  {savingCash ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG EDIT PAGU KATEGORI */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md w-[90%] rounded-2xl bg-white border-0">
            <DialogHeader>
              <DialogTitle>Edit Pagu {editingCategory?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Jumlah Pagu (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                  <Input type="text" inputMode="numeric" value={editAmount ? parseInt(editAmount).toLocaleString('id-ID') : ''} onChange={(e) => setEditAmount(e.target.value.replace(/\D/g, ''))} className="pl-12 h-14 text-lg font-bold rounded-xl focus-visible:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setEditDialogOpen(false)}>Batal</Button>
                <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}