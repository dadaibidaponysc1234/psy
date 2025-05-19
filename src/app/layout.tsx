import type { Metadata } from "next"
import { Syne } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import NavBar from "@/components/nav"
import Footer from "@/components/footer"
import Providers from "@/components/Providers"
import { APP_NAME } from "@/static"

const syne = Syne({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_NAME,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script async src="https://d3js.org/d3.v7.min.js"></script>
        <script
          async
          src="https://cdnjs.cloudflare.com/ajax/libs/d3-cloud/1.2.5/d3.layout.cloud.min.js"
        ></script>

        <script async src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <link rel="shortcut icon" href="/icons/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>

      <body
        className={cn("flex min-h-dvh flex-col antialiased", syne.className)}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
