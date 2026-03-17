import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social Pro — Agency Social Media Management",
  description:
    "Comprehensive social media management and client management panel for agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
