import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import kedua Provider kita
import { AuthProvider } from "./context/AuthContext";
import { EventProvider } from "./context/EventContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dompet Lapangan",
  description: "Aplikasi pencatatan keuangan kegiatan lapangan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          <EventProvider>
            {children}
          </EventProvider>
        </AuthProvider>
      </body>
    </html>
  );
}