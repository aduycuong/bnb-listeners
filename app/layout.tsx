import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import i18nConfig from "@/i18n.config";
import {
  getResources,
  getT,
  initServerI18next,
} from "next-i18next/server";
import { I18nProvider } from "next-i18next/client";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

initServerI18next(i18nConfig);

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT("common");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { i18n, lng } = await getT(["common", "auth", "dashboard", "forms"]);
  const resources = getResources(i18n, ["common", "auth", "dashboard", "forms"]);

  return (
    <html lang={lng} className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <I18nProvider language={lng} resources={resources}>
          <ThemeProvider>
            <TooltipProvider>
              <QueryProvider>
                <AuthProvider>{children}</AuthProvider>
                <Toaster />
              </QueryProvider>
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
