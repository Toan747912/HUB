import { Inter, Outfit } from "next/font/google";
import "@/shared/styles/globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "AI Mentor OS",
  description: "Adaptive AI-powered learning orchestration engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} dark`}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
