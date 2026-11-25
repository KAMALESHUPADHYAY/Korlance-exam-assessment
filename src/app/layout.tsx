import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KORLANCE Assessment | Technical Placement Portal",
  description:
    "Online Technical Placement Assessment for Korlance (Hyderabad & Bengaluru)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-white selection:bg-violet-500/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
