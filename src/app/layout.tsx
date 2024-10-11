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
    <html lang="en ">
      <script async src="https://d3js.org/d3.v7.min.js"></script>
      <script
        async
        src="https://cdnjs.cloudflare.com/ajax/libs/d3-cloud/1.2.5/d3.layout.cloud.min.js"
      ></script>
      <script async src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      <body className={cn("min-h-screen antialiased", syne.className)}>
        <Providers>
          <NavBar />
          <div className="flex flex-col min-h-screen">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
