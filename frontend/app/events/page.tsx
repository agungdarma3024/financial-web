"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Calendar, Plus, ChevronRight, Loader2, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import ProtectedRoute from "@/components/ProtectedRoute";
import { EventContext, EventData } from "../context/EventContext";

export default function EventsPage() {
  const router = useRouter();
  const { setActiveEvent, activeEvent } = useContext(EventContext);
  
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk form tambah kegiatan
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCash, setNewCash] = useState("");
  const [saving, setSaving] = useState(false);

  // Mengambil daftar kegiatan dari backend
  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:8000/api/events", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data);
    } catch (error) {
      console.error("Gagal mengambil data kegiatan", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Menyimpan kegiatan baru ke backend
  const handleCreateEvent = async () => {
    if (!newName || !newCash) return alert("Harap isi semua kolom");
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:8000/api/events", 
        { name: newName, initial_cash: parseInt(newCash) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsDialogOpen(false);
      setNewName("");
      setNewCash("");
      fetchEvents(); // Refresh daftar kegiatan
    } catch (error) {
      alert("Gagal membuat kegiatan");
    } finally {
      setSaving(false);
    }
  };

  // Saat user memilih kegiatan, simpan ke brankas lalu lempar ke Dashboard
  const handleSelectEvent = (event: EventData) => {
    setActiveEvent(event);
    router.push("/");
  };

  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-4 pb-28 space-y-5 animate-in fade-in">
        
        <div className="flex items-center justify-between pt-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kegiatan Saya</h1>
            <p className="text-sm text-slate-500">Pilih kegiatan untuk dikelola</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl w-10 h-10 p-0">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* LIST KEGIATAN */}
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : events.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-2xl border border-slate-100 border-dashed">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada kegiatan.</p>
            <p className="text-sm text-slate-400 mb-4">Buat kegiatan pertamamu sekarang.</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="rounded-xl">Tambah Kegiatan</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card 
                key={event.id} 
                className={`border-0 shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${activeEvent?.id === event.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}`}
                onClick={() => handleSelectEvent(event)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${activeEvent?.id === event.id ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      <Wallet className={`w-5 h-5 ${activeEvent?.id === event.id ? 'text-blue-600' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{event.name}</h3>
                      <p className="text-xs text-slate-500">Modal: Rp {event.initial_cash.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* DIALOG TAMBAH KEGIATAN */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Kegiatan Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nama Kegiatan</Label>
                <Input 
                  placeholder="Contoh: Kunker Bandung" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Modal Awal (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newCash ? parseInt(newCash).toLocaleString('id-ID') : ''}
                    onChange={(e) => setNewCash(e.target.value.replace(/\D/g, ''))}
                    className="pl-12 h-12 rounded-xl text-lg font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreateEvent} disabled={saving}>
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}