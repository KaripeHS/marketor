import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SentryProvider } from "@/components/providers/SentryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Marketor",
    description: "AI-Powered Marketing Platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    <SentryProvider>
                        {children}
                    </SentryProvider>
                    <ToastProvider />
                </AuthProvider>
            </body>
        </html>
    );
}
