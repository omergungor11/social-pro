'use client';

import * as React from 'react';
import { Check, Minus, Star, Phone, Zap, Building2, Rocket, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlanId = 'free' | 'pro' | 'business' | 'enterprise';
type BillingCycle = 'monthly' | 'yearly';

interface PlanFeature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
  enterprise: string | boolean;
}

interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentClass: string;
  cta: string;
  ctaVariant: 'default' | 'outline' | 'secondary';
  mostPopular: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Get started with the basics. Perfect for freelancers.',
    icon: Gift,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    accentClass: 'border-slate-200',
    cta: 'Downgrade',
    ctaVariant: 'outline',
    mostPopular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: 'For growing agencies managing multiple clients.',
    icon: Zap,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accentClass: 'border-blue-200',
    cta: 'Downgrade',
    ctaVariant: 'outline',
    mostPopular: false,
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 99,
    yearlyPrice: 79,
    description: 'The full suite for established agencies with big teams.',
    icon: Rocket,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accentClass: 'border-violet-300 ring-2 ring-violet-200',
    cta: 'Current Plan',
    ctaVariant: 'default',
    mostPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 199,
    yearlyPrice: 159,
    description: 'Custom solutions for large agencies and media groups.',
    icon: Building2,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    accentClass: 'border-amber-200 bg-gradient-to-b from-amber-50/40 to-white',
    cta: 'Contact Us',
    ctaVariant: 'secondary',
    mostPopular: false,
  },
];

const FEATURES: PlanFeature[] = [
  { label: 'Social Accounts', free: '3', pro: '10', business: '25', enterprise: 'Unlimited' },
  { label: 'Clients', free: '1', pro: '5', business: '10', enterprise: 'Unlimited' },
  { label: 'Team Members', free: '1', pro: '3', business: '5', enterprise: 'Unlimited' },
  { label: 'Posts / Month', free: '30', pro: '200', business: '500', enterprise: 'Unlimited' },
  { label: 'AI Credits / Month', free: '100', pro: '2,000', business: '5,000', enterprise: '25,000' },
  { label: 'Storage', free: '500 MB', pro: '5 GB', business: '10 GB', enterprise: '100 GB' },
  { label: 'Analytics & Reports', free: 'Basic', pro: 'Advanced', business: 'Full', enterprise: 'Custom' },
  { label: 'White-label Reports', free: false, pro: false, business: '5 reports', enterprise: 'Unlimited' },
  { label: 'Custom Branding', free: false, pro: false, business: true, enterprise: true },
  { label: 'API Access', free: false, pro: false, business: false, enterprise: true },
  { label: 'Dedicated Support', free: false, pro: false, business: false, enterprise: true },
  { label: 'SSO / SAML', free: false, pro: false, business: false, enterprise: true },
];

const CURRENT_PLAN: PlanId = 'business';
const YEARLY_DISCOUNT_PCT = 20;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FeatureValue({ value }: { value: string | boolean }): React.JSX.Element {
  if (value === false) {
    return <Minus className="h-4 w-4 text-slate-300 mx-auto" aria-label="Not included" />;
  }
  if (value === true) {
    return <Check className="h-4 w-4 text-emerald-500 mx-auto" aria-label="Included" />;
  }
  return <span className="text-sm text-slate-700 font-medium">{value}</span>;
}

interface PricingCardProps {
  plan: Plan;
  billing: BillingCycle;
  isCurrent: boolean;
}

function PricingCard({ plan, billing, isCurrent }: PricingCardProps): React.JSX.Element {
  const Icon = plan.icon;
  const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const isEnterprise = plan.id === 'enterprise';

  return (
    <article
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 transition-shadow duration-200',
        plan.accentClass,
        plan.mostPopular ? 'shadow-xl shadow-violet-100' : 'shadow-sm hover:shadow-md'
      )}
    >
      {/* Most popular badge */}
      {plan.mostPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-violet-600/30">
            <Star className="h-3 w-3 fill-white" aria-hidden="true" />
            Most Popular
          </span>
        </div>
      )}

      {/* Plan header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', plan.iconBg)}>
            <Icon className={cn('h-5 w-5', plan.iconColor)} aria-hidden="true" />
          </div>
          {isCurrent && (
            <Badge variant="green">Current Plan</Badge>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="py-2">
          {price === null || isEnterprise ? (
            <div>
              <p className="text-3xl font-bold text-slate-900">Custom</p>
              <p className="text-xs text-slate-400 mt-0.5">Tailored pricing for your needs</p>
            </div>
          ) : price === 0 ? (
            <div>
              <p className="text-3xl font-bold text-slate-900">Free</p>
              <p className="text-xs text-slate-400 mt-0.5">No credit card required</p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">${price}</span>
                <span className="text-sm text-slate-400">/ mo</span>
              </div>
              {billing === 'yearly' && (
                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                  Save {YEARLY_DISCOUNT_PCT}% vs monthly
                </p>
              )}
              {billing === 'monthly' && (
                <p className="text-xs text-slate-400 mt-0.5">Billed monthly</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature highlights */}
      <ul className="my-5 space-y-2.5 flex-1" aria-label={`${plan.name} features`}>
        {FEATURES.slice(0, 6).map((feature) => {
          const val = feature[plan.id];
          if (val === false) return null;
          return (
            <li key={feature.label} className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-slate-600">
                <span className="font-medium text-slate-800">{val === true ? feature.label : val}</span>
                {val !== true && (
                  <span className="text-slate-400"> {feature.label.toLowerCase()}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      {isEnterprise ? (
        <Button
          variant="secondary"
          className="w-full gap-2"
          aria-label="Contact sales for Enterprise plan"
        >
          <Phone className="h-4 w-4" />
          Contact Us
        </Button>
      ) : isCurrent ? (
        <Button
          variant="default"
          className="w-full"
          disabled
          aria-label="Current plan"
        >
          Current Plan
        </Button>
      ) : (
        <Button
          variant={plan.ctaVariant}
          className="w-full"
          aria-label={`${plan.cta} to ${plan.name} plan`}
        >
          {plan.cta}
        </Button>
      )}
    </article>
  );
}

// Full comparison table
interface ComparisonTableProps {
  billing: BillingCycle;
}

function ComparisonTable({ billing: _billing }: ComparisonTableProps): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-1/3">
              Feature
            </th>
            {PLANS.map((p) => (
              <th
                key={p.id}
                className={cn(
                  'py-3 px-4 text-center text-xs font-semibold uppercase tracking-wide',
                  p.id === CURRENT_PLAN ? 'text-violet-700' : 'text-slate-500'
                )}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {FEATURES.map((feature) => (
            <tr key={feature.label} className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 font-medium text-slate-700">{feature.label}</td>
              {PLANS.map((p) => (
                <td
                  key={p.id}
                  className={cn(
                    'py-3 px-4 text-center',
                    p.id === CURRENT_PLAN && 'bg-violet-50/40'
                  )}
                >
                  <FeatureValue value={feature[p.id]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlansPage(): React.JSX.Element {
  const [billing, setBilling] = React.useState<BillingCycle>('monthly');

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Choose Your Plan
        </h1>
        <p className="text-slate-500">
          Scale your agency with the right plan. Upgrade or downgrade at any time.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setBilling('monthly')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
              billing === 'monthly'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
            aria-pressed={billing === 'monthly'}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
              billing === 'yearly'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
            aria-pressed={billing === 'yearly'}
          >
            Yearly
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                billing === 'yearly'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-100 text-emerald-700'
              )}
            >
              -{YEARLY_DISCOUNT_PCT}%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <section aria-label="Pricing plans">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billing={billing}
              isCurrent={plan.id === CURRENT_PLAN}
            />
          ))}
        </div>
      </section>

      {/* Feature comparison table */}
      <section aria-labelledby="comparison-heading">
        <h2
          id="comparison-heading"
          className="text-lg font-bold text-slate-900 mb-5 text-center"
        >
          Full Feature Comparison
        </h2>
        <ComparisonTable billing={billing} />
      </section>

      {/* Enterprise CTA banner */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 mx-auto">
          <Building2 className="h-6 w-6 text-amber-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Need a custom solution?</h3>
          <p className="text-sm text-slate-500 mt-1">
            Our Enterprise plan offers unlimited everything, custom branding, dedicated support,
            and SLA guarantees tailored to your agency.
          </p>
        </div>
        <Button size="lg" variant="secondary" className="gap-2">
          <Phone className="h-4 w-4" />
          Talk to Sales
        </Button>
      </div>
    </div>
  );
}
