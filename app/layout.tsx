import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { LoaderProvider } from "@/components/loader/LoaderContext";
import { GlobalLoaderBar, GlobalLoaderOverlay } from "@/components/loader/Loader";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenDayCare",
  description: "Feed de la guardería OpenDayCare",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LoaderProvider>
          {children}
          <GlobalLoaderBar />
          <GlobalLoaderOverlay />
        </LoaderProvider>
      </body>
    </html>
  );
}
