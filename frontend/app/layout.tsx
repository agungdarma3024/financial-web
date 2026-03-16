import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import kedua Provider kita
import { AuthProvider } from "./context/AuthContext";
import { EventProvider } from "./context/EventContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dompet Lapangan",
  description: "Aplikasi pencatatan keuangan kegiatan lapangan yang transparan dan aman.",
  openGraph: {
    title: "Dompet Lapangan | Anti Bocor, Anti Ribet",
    description: "Catat transaksi dan upload bukti struk langsung dari lapangan. Transparan, aman, dan siap diaudit kapan saja.",
    url: "https://financial-web-pi.vercel.app",
    siteName: "Dompet Lapangan",
    images: [
      {
        url: "../public/preview.png", // Pastikan file gambar bernama preview.png ada di dalam folder 'public'
        width: 1200,
        height: 630,
        alt: "Tampilan Dashboard Dompet Lapangan",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
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