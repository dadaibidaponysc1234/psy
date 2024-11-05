import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import NavBar from "@/components/nav";
import Footer from "@/components/footer";
import Providers from "@/components/Providers";

const syne = Syne({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PsychGen Africa",
  description: "PsychGen Africa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <script async src="https://d3js.org/d3.v7.min.js"></script>
      <script
        async
        src="https://cdnjs.cloudflare.com/ajax/libs/d3-cloud/1.2.5/d3.layout.cloud.min.js"
      ></script>
      <script async src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      <link rel="shortcut icon" href="/icons/favicon.svg" />
      <body
        className={cn("min-h-dvh flex flex-col antialiased", syne.className)}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
