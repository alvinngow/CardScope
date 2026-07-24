import type { Metadata } from "next";
import "./globals.css";

const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: appUrl,
  title: "CardScope",
  description: "A self-hosted dashboard for monthly credit card statements.",
  openGraph: {
    title: "CardScope",
    description: "Monthly credit card statement imports and spending overview.",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
