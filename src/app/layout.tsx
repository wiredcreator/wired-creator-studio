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
          h1 {
            font-family: var(--font-heading), 'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif;
            font-weight: 600;
            letter-spacing: -0.01em;
          }
          h2, h3, h4 {
            font-family: var(--font-heading), 'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif;
            font-weight: 600;
            letter-spacing: 0.03em !important;
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
