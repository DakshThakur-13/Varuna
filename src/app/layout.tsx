import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Varuna AI | Healthcare Crisis Management",
  description: "AI-native nervous system for healthcare facilities. Predictive intelligence for emergency department surge management.",
  keywords: ["healthcare", "AI", "emergency", "triage", "hospital", "crisis management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
