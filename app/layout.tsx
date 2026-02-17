import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HD Sheet Metal & Fabrication — Instant Quote",
  description: "Get an instant estimate for your sheet metal fabrication project. Upload your DXF file, select materials, and receive a quote in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
