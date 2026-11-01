import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter, Lato, Merriweather, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { THEME_INIT_SCRIPT } from "@/lib/settings";
import { ResumeStoreProvider } from "@/hooks/useResumeStore";
import { AiProvider } from "@/components/ai/AiProvider";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Resume fonts — the live preview uses these; PDF export embeds matching TTF files.
const sourceSans = Source_Sans_3({ variable: "--font-source-sans-3", subsets: ["latin"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"] });
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const garamond = EB_Garamond({ variable: "--font-eb-garamond", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ResumeForge — AI Resume Builder for Students",
  description:
    "Build a clean, ATS-friendly resume with friendly questions, live preview and honest AI polishing. Private by design.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontVars = [inter, sourceSans, lato, merriweather, garamond].map((f) => f.variable).join(" ");
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 btn btn-primary"
        >
          Skip to content
        </a>
        <ResumeStoreProvider>
          <AiProvider>
          <SiteHeader />
          <main id="main" className="flex-1 flex flex-col">
            {children}
          </main>
          <SiteFooter />
          </AiProvider>
        </ResumeStoreProvider>
      </body>
    </html>
  );
}
