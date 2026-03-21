import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Social Pro",
    default: "Social Pro — Agency Social Media Management",
  },
  description:
    "The all-in-one social media management platform built for digital agencies. Manage all your clients, platforms, and content from a single dashboard.",
  keywords: [
    "social media management",
    "agency",
    "scheduling",
    "analytics",
    "AI content",
    "multi-platform",
  ],
  openGraph: {
    title: "Social Pro — Agency Social Media Management",
    description:
      "The all-in-one social media management platform built for digital agencies.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
