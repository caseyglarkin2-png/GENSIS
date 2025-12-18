import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Facility Command Center",
  description: "Model and prioritize facility network rollouts with verified geometry and defensible ROI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
