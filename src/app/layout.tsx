import type { Metadata } from "next";
import '../styles/globals.css'

export const metadata: Metadata = {
    title: "Code Collab", 
    description: "Real-time pair programming for coding enthusiasts"
}

export default function RootLayout({
    children, 
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}