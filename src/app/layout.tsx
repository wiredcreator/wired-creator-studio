import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import localFont from "next/font/local";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const lanterne = localFont({
  src: "../../public/fonts/Lanterne-Regular.woff2",
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wired Creator Studio",
  description: "AI-powered content creation platform for creators with ADHD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          .font-heading {
            font-family: var(--font-heading), 'Atkinson Hyperlegible', system-ui, sans-serif;
          }
        `}} />
      </head>
      <body
        className={`${atkinson.variable} ${lanterne.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
