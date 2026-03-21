import Link from "next/link";
import {
  Share2,
  Sparkles,
  BarChart3,
  Users,
  GitBranch,
  CalendarClock,
  Check,
  ArrowRight,
  Star,
  Zap,
  Globe,
  ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: string;
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  initials: string;
  avatarBg: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES: Feature[] = [
  {
    title: "Multi-Platform Publishing",
    description:
      "Publish simultaneously to X, Facebook, Instagram, LinkedIn, TikTok, and YouTube. One post, every platform, zero friction.",
    icon: Share2,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    badge: "6 Platforms",
  },
  {
    title: "AI Content Generation",
    description:
      "Powered by Claude and OpenAI. Generate on-brand captions, hashtags, and full content calendars in seconds.",
    icon: Sparkles,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    badge: "Claude + OpenAI",
  },
  {
    title: "Advanced Analytics",
    description:
      "Deep performance reports across all clients and platforms. Track engagement, reach, and ROI with exportable dashboards.",
    icon: BarChart3,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
  {
    title: "Client Management",
    description:
      "Manage unlimited clients with groups, bulk operations, and individual permission sets. Built for agencies at scale.",
    icon: Users,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
  {
    title: "Team Collaboration",
    description:
      "Role-based access, approval workflows, and activity logs. Your team stays aligned, your clients stay informed.",
    icon: GitBranch,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-400",
  },
  {
    title: "Automated Scheduling",
    description:
      "Visual content calendar, smart queue, and best-time suggestions. Set it and let Social Pro handle the rest.",
    icon: CalendarClock,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
  },
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for solo freelancers just getting started.",
    features: [
      "1 client",
      "3 social accounts",
      "10 posts / month",
      "Basic scheduling",
      "Email support",
    ],
    cta: "Get started free",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "per month",
    description: "For small agencies ready to grow their client roster.",
    features: [
      "10 clients",
      "15 social accounts",
      "100 posts / month",
      "Basic AI generation",
      "Analytics dashboard",
      "Priority email support",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "per month",
    description: "The full toolkit for established agencies.",
    features: [
      "50 clients",
      "Unlimited social accounts",
      "Unlimited posts",
      "Full AI (Claude + OpenAI)",
      "Advanced analytics & reports",
      "Team collaboration & approvals",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "per month",
    description: "For large-scale agencies with custom needs.",
    features: [
      "Unlimited clients",
      "Unlimited everything",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "SSO / SAML",
      "White-label option",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Social Pro completely transformed how we manage our 40+ client accounts. What used to take our team 2 days now takes a few hours. The AI content generation alone is worth every penny.",
    author: "Sarah Mitchell",
    role: "Head of Social Media",
    company: "Bright Agency",
    initials: "SM",
    avatarBg: "bg-blue-500",
  },
  {
    quote:
      "The multi-platform publishing and analytics are best-in-class. Our clients love the detailed reports, and our team loves how easy it is to manage approvals without constant back-and-forth.",
    author: "Marcus Chen",
    role: "Founder & CEO",
    company: "Crux Digital",
    initials: "MC",
    avatarBg: "bg-violet-500",
  },
  {
    quote:
      "We switched from three separate tools to Social Pro and cut our tooling costs by 60%. The client management features are exactly what a growing agency needs — groups, bulk ops, all of it.",
    author: "Lena Vasquez",
    role: "Operations Director",
    company: "Orbit Media Group",
    initials: "LV",
    avatarBg: "bg-emerald-500",
  },
];

// ---------------------------------------------------------------------------
// SEO metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Social Pro — Agency Social Media Management",
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LogoMark(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            fill="white"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-white">
        Social Pro
      </span>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }): React.JSX.Element {
  const Icon = feature.icon;
  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm transition-all duration-200 hover:border-white/15 hover:bg-white/5">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg}`}
        >
          <Icon
            className={`h-5 w-5 ${feature.iconColor}`}
            aria-hidden="true"
          />
        </div>
        {feature.badge !== undefined && (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">
            {feature.badge}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-white">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-slate-400">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

function PricingCard({ tier }: { tier: PricingTier }): React.JSX.Element {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 ${
        tier.highlighted
          ? "bg-blue-600 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-50"
          : "border border-slate-200 bg-white"
      }`}
    >
      {tier.badge !== undefined && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            {tier.badge}
          </span>
        </div>
      )}

      <div className="mb-6 space-y-2">
        <h3
          className={`text-lg font-semibold ${tier.highlighted ? "text-white" : "text-slate-900"}`}
        >
          {tier.name}
        </h3>
        <div className="flex items-end gap-1">
          <span
            className={`text-4xl font-bold tracking-tight ${tier.highlighted ? "text-white" : "text-slate-900"}`}
          >
            {tier.price}
          </span>
          <span
            className={`mb-1 text-sm ${tier.highlighted ? "text-blue-200" : "text-slate-500"}`}
          >
            /{tier.period}
          </span>
        </div>
        <p
          className={`text-sm ${tier.highlighted ? "text-blue-100" : "text-slate-500"}`}
        >
          {tier.description}
        </p>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5">
            <Check
              className={`h-4 w-4 shrink-0 ${tier.highlighted ? "text-blue-200" : "text-emerald-500"}`}
              aria-hidden="true"
            />
            <span
              className={`text-sm ${tier.highlighted ? "text-blue-50" : "text-slate-700"}`}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/register"
        className={`flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-all duration-150 ${
          tier.highlighted
            ? "bg-white text-blue-600 hover:bg-blue-50"
            : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  );
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: Testimonial;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-1" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="h-4 w-4 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
        ))}
      </div>
      <blockquote className="flex-1 text-sm leading-relaxed text-slate-600">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${testimonial.avatarBg}`}
          aria-hidden="true"
        >
          {testimonial.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {testimonial.author}
          </p>
          <p className="text-xs text-slate-500">
            {testimonial.role}, {testimonial.company}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      {/* ------------------------------------------------------------------ */}
      {/* Navbar                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
          aria-label="Main navigation"
        >
          <LogoMark />

          <ul className="hidden items-center gap-6 md:flex" role="list">
            <li>
              <a
                href="#features"
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                Pricing
              </a>
            </li>
            <li>
              <a
                href="#testimonials"
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                Testimonials
              </a>
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        {/* Background blobs */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden="true"
        >
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -right-40 -bottom-20 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            Purpose-built for digital agencies
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Manage All Your{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Social Media
            </span>{" "}
            in One Place
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">
            Social Pro gives your agency a single command center for every
            client, platform, and post. AI-powered content, advanced analytics,
            and seamless team collaboration — all under one roof.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-8 text-base font-semibold text-white shadow-xl shadow-blue-600/30 transition-all duration-150 hover:bg-blue-500 hover:shadow-blue-500/30"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#features"
              className="flex h-12 items-center rounded-xl border border-white/10 bg-white/5 px-8 text-base font-semibold text-white backdrop-blur-sm transition-all duration-150 hover:bg-white/10"
            >
              See features
            </a>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            No credit card required. 14-day free trial on all plans.
          </p>

          {/* Hero visual — abstract dashboard illustration */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-white/10 bg-slate-800/50 shadow-2xl shadow-black/50 backdrop-blur-sm">
            {/* Mock browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/5 bg-slate-800/80 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/70" />
              <div className="h-3 w-3 rounded-full bg-amber-500/70" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              <div className="ml-4 h-5 w-full max-w-xs rounded-md bg-white/5" />
            </div>

            {/* Mock dashboard body */}
            <div className="grid grid-cols-4 gap-3 p-6">
              {/* Stat cards */}
              {[
                { label: "Total Clients", val: "24", color: "bg-blue-500/20" },
                {
                  label: "Social Accounts",
                  val: "87",
                  color: "bg-violet-500/20",
                },
                {
                  label: "Scheduled Posts",
                  val: "142",
                  color: "bg-emerald-500/20",
                },
                { label: "AI Credits", val: "3.8k", color: "bg-amber-500/20" },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl ${s.color} border border-white/5 p-3`}
                >
                  <div className="mb-2 h-2 w-16 rounded-full bg-white/20" />
                  <div className="h-6 w-10 rounded bg-white/30" />
                </div>
              ))}

              {/* Chart placeholder */}
              <div className="col-span-3 rounded-xl border border-white/5 bg-white/3 p-4">
                <div className="mb-4 h-2 w-24 rounded-full bg-white/15" />
                <div className="flex h-20 items-end gap-1.5">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-blue-500/30"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Activity panel */}
              <div className="rounded-xl border border-white/5 bg-white/3 p-4">
                <div className="mb-3 h-2 w-16 rounded-full bg-white/15" />
                <div className="space-y-2">
                  {["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500"].map(
                    (color, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${color}`}
                        />
                        <div className="h-1.5 flex-1 rounded-full bg-white/10" />
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Trust bar                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-slate-100 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Trusted by agencies worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              "Bright Agency",
              "Crux Digital",
              "Orbit Media Group",
              "Peak Social",
              "Momentum Labs",
            ].map((name) => (
              <span key={name} className="text-sm font-semibold text-slate-400">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="features"
        className="scroll-mt-20 bg-slate-950 px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300">
              <Globe
                className="h-3.5 w-3.5 text-blue-400"
                aria-hidden="true"
              />
              Everything your agency needs
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              All the tools. None of the chaos.
            </h2>
            <p className="text-lg text-slate-400">
              Social Pro consolidates your entire social media workflow into one
              intuitive platform. No more tab-switching, no more manual reports.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pricing                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="pricing"
        className="scroll-mt-20 bg-slate-50 px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <ShieldCheck
                className="h-3.5 w-3.5 text-emerald-500"
                aria-hidden="true"
              />
              Simple, transparent pricing
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Plans that grow with your agency
            </h2>
            <p className="text-lg text-slate-500">
              Start free, upgrade when you&apos;re ready. Every plan includes a
              14-day trial with no credit card required.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING_TIERS.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            All plans include SSL, 99.9% uptime SLA, and GDPR compliance.{" "}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Compare all features
            </Link>
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Testimonials                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="testimonials"
        className="scroll-mt-20 bg-white px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600">
              <Star
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              Loved by agencies
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Real results from real agencies
            </h2>
            <p className="text-lg text-slate-500">
              Hundreds of agencies have replaced their fragmented tool stacks
              with Social Pro.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <TestimonialCard
                key={testimonial.author}
                testimonial={testimonial}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA Banner                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-blue-600 px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          aria-hidden="true"
        >
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to take your agency to the next level?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Join hundreds of agencies already using Social Pro to scale their
            social media operations.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex h-12 items-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-blue-600 shadow-xl shadow-black/10 transition-all duration-150 hover:bg-blue-50"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="flex h-12 items-center rounded-xl border border-white/20 px-8 text-base font-semibold text-white transition-all duration-150 hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-slate-100 bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <LogoMark />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
                The all-in-one social media management platform built for
                digital agencies.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Product
              </h3>
              <ul className="space-y-3" role="list">
                {["Features", "Pricing", "Changelog", "Roadmap"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Company
              </h3>
              <ul className="space-y-3" role="list">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Legal
              </h3>
              <ul className="space-y-3" role="list">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
            <p className="text-xs text-slate-600">
              &copy; {new Date().getFullYear()} Social Pro. All rights reserved.
            </p>
            <p className="text-xs text-slate-600">
              Built for agencies, by agencies.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
