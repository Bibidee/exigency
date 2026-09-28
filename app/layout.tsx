import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EXIGENT | Emergency Authority on GenLayer",
  description: "Pre-commit emergency powers, verify the crisis, unlock only the exact action GenLayer finalizes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
