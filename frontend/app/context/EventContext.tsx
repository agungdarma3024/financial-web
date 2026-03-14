"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";

// Bentuk data kegiatan
export interface EventData {
  id: string;
  name: string;
  initial_cash: number;
}

interface EventContextType {
  activeEvent: EventData | null;
  setActiveEvent: (event: EventData) => void;
}

// Buat Brankas Ingatan
export const EventContext = createContext<EventContextType>({
  activeEvent: null,
  setActiveEvent: () => {},
});

export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [activeEvent, setActiveEventState] = useState<EventData | null>(null);

  // Saat web dimuat, cek apakah sebelumnya sudah ada kegiatan yang dipilih
  useEffect(() => {
    const storedEvent = localStorage.getItem("activeEvent");
    if (storedEvent) {
      setActiveEventState(JSON.parse(storedEvent));
    }
  }, []);

  // Fungsi untuk memilih kegiatan dan menyimpannya di browser
  const setActiveEvent = (event: EventData) => {
    localStorage.setItem("activeEvent", JSON.stringify(event));
    setActiveEventState(event);
  };

  return (
    <EventContext.Provider value={{ activeEvent, setActiveEvent }}>
      {children}
    </EventContext.Provider>
  );
};