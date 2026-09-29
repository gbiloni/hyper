import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald" });

export const metadata: Metadata = {
  title: {
    default: "Hyper ISP - Gestión de Redes",
    template: "%s | Hyper ISP",
  },
  description: "Sistema de Gestión de Redes",
  icons: {
    icon: "/hyper.ico",
    shortcut: "/hyper.ico",
    apple: "/hyper.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hyper ISP",
  },
  verification: {
    other: {
      "facebook-domain-verification": ["packfe2rnp5en5j299s36zmcvqt9ki"],
    },
  },
  other: {
    "mobile-web-app-capable": "yes",
    "facebook-domain-verification": "packfe2rnp5en5j299s36zmcvqt9ki",
  },
};

export const viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
