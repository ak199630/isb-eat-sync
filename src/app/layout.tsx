import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { StallsProvider } from "@/contexts/StallsContext";
import { CartProvider } from "@/contexts/CartContext";
import { CustomerHeader } from "@/components/CustomerHeader";

export const metadata: Metadata = {
  title: "ISB Eat-Sync",
  description: "Hyper-local campus food orchestration for ISB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans">
        <AuthProvider>
        <StallsProvider>
          <CartProvider>
          <CustomerHeader />
          <main>{children}</main>
          </CartProvider>
        </StallsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
