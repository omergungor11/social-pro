'use client';

import * as React from 'react';
import { Check, Minus, Star, Phone, Zap, Building2, Rocket, Gift, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BillingCycle = 'monthly' | 'yearly';

interface PlanFeature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
  enterprise: string | boolean;
}

interface Plan {
  id: string;
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
  features: string[];
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiPlan {
  id: string;
  name?: string;
  description?: string;
  monthlyPrice?: number;
  price?: number;
  yearlyPrice?: number;
  annualPrice?: number;
  popular?: boolean;
  mostPopular?: boolean;
  features?: string[];
  limits?: Record<string, number | string>;
}

interface ApiSubscription {
  planId?: string;
  plan?: { id?: string };
  status?: string;
}

// ---------------------------------------------------------------------------
// Static feature comparison table data (kept as UI fixture — API plans
// don't yet return a structured feature matrix)
// ---------------------------------------------------------------------------

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

const YEARLY_DISCOUNT_PCT = 20;

// ---------------------------------------------------------------------------
// Helpers — map API plan to UI plan shape
// ---------------------------------------------------------------------------

// Icon/style lookup by rough name matching
function getPlanStyle(name: string): Pick<Plan, 'icon' | 'iconBg' | 'iconColor' | 'accentClass' | 'mostPopular'> {
  const lower = name.toLowerCase();
  if (lower.includes('enterprise')) {
    return {
      icon: Building2,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accentClass: 'border-amber-200 bg-gradient-to-b from-amber-50/40 to-white',
      mostPopular: false,
    };
  }
  if (lower.includes('business')) {
    return {
      icon: Rocket,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      accentClass: 'border-violet-300 ring-2 ring-violet-200',
      mostPopular: true,
    };
  }
  if (lower.includes('pro')) {
    return {
      icon: Zap,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accentClass: 'border-blue-200',
      mostPopular: false,
    };
  }
  // Free / default
  return {
    icon: Gift,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    accentClass: 'border-slate-200',
    mostPopular: false,
  };
}

function mapApiPlan(p: ApiPlan, currentPlanId: string): Plan {
  const style = getPlanStyle(p.name ?? p.id);
  const monthlyPrice = p.monthlyPrice ?? p.price ?? 0;
  const yearlyPrice = p.yearlyPrice ?? p.annualPrice ?? Math.round(monthlyPrice * (1 - YEARLY_DISCOUNT_PCT / 100));
  const isCurrent = p.id === currentPlanId;
  const isEnterprise = (p.name ?? '').toLowerCase().includes('enterprise');

  let cta = 'Upgrade';
  let ctaVariant: Plan['ctaVariant'] = 'default';
  if (isCurrent) {
    cta = 'Current Plan';
    ctaVariant = 'default';
  } else if (isEnterprise) {
    cta = 'Contact Us';
    ctaVariant = 'secondary';
  } else if (monthlyPrice < (Number(currentPlanId) || 0)) {
    cta = 'Downgrade';
    ctaVariant = 'outline';
  }

  return {
    id: p.id,
    name: p.name ?? p.id,
    monthlyPrice: monthlyPrice === 0 ? 0 : monthlyPrice,
    yearlyPrice,
    description: p.description ?? '',
    icon: style.icon,
    iconBg: style.iconBg,
    iconColor: style.iconColor,
    accentClass: style.accentClass,
    cta,
    ctaVariant,
    mostPopular: p.popular ?? p.mostPopular ?? style.mostPopular,
    features: p.features ?? [],
  };
}

// ---------------------------------------------------------------------------
// Fallback static plans (shown while loading or if API returns no plans)
// ---------------------------------------------------------------------------

const FALLBACK_PLANS: Plan[] = [
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
    cta: 'Current Plan',
    ctaVariant: 'outline',
    mostPopular: false,
    features: [],
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
    cta: 'Upgrade',
    ctaVariant: 'default',
    mostPopular: false,
    features: [],
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
    cta: 'Upgrade',
    ctaVariant: 'default',
    mostPopular: true,
    features: [],
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
    features: [],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FeatureValue({ value }: { value: string | boolean | undefined }): React.JSX.Element {
  if (value === false || value === undefined) {
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
  onSelect: (planId: string) => void;
  loading: boolean;
}

function PricingCard({ plan, billing, isCurrent, onSelect, loading }: PricingCardProps): React.JSX.Element {
  const Icon = plan.icon;
  const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const isEnterprise = plan.name.toLowerCase().includes('enterprise');

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

      {/* Feature highlights from API (when available) */}
      {plan.features.length > 0 && (
        <ul className="my-5 space-y-2.5 flex-1" aria-label={`${plan.name} features`}>
          {plan.features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-slate-600">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <div className="mt-auto pt-5">
        {isEnterprise ? (
          <Button
            variant="secondary"
            className="w-full gap-2"
            aria-label="Contact sales for Enterprise plan"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
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
            onClick={() => onSelect(plan.id)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {plan.cta}
          </Button>
        )}
      </div>
    </article>
  );
}

interface ComparisonTableProps {
  plans: Plan[];
  currentPlanId: string;
}

function ComparisonTable({ plans, currentPlanId }: ComparisonTableProps): React.JSX.Element {
  // Build a plan-id to column index lookup for feature table
  // We use a fixed 4-column structure mapped by plan name normalisation
  const getPlanFeatureKey = (planId: string): keyof PlanFeature | null => {
    const lower = planId.toLowerCase();
    if (lower.includes('enterprise')) return 'enterprise';
    if (lower.includes('business')) return 'business';
    if (lower.includes('pro')) return 'pro';
    if (lower.includes('free')) return 'free';
    return null;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-1/3">
              Feature
            </th>
            {plans.map((p) => (
              <th
                key={p.id}
                className={cn(
                  'py-3 px-4 text-center text-xs font-semibold uppercase tracking-wide',
                  p.id === currentPlanId ? 'text-violet-700' : 'text-slate-500'
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
              {plans.map((p) => {
                const key = getPlanFeatureKey(p.id);
                const val = key !== null ? feature[key] : '—';
                return (
                  <td
                    key={p.id}
                    className={cn(
                      'py-3 px-4 text-center',
                      p.id === currentPlanId && 'bg-violet-50/40'
                    )}
                  >
                    <FeatureValue value={val} />
                  </td>
                );
              })}
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
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = React.useState<string>('free');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchPlans = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, subData] = await Promise.all([
        apiClient.get<ApiPlan[]>('/billing/plans').catch(() => null),
        apiClient.get<ApiSubscription>('/billing/subscription').catch(() => null),
      ]);

      // Resolve current plan id
      const resolvedCurrentPlanId =
        subData?.planId ?? subData?.plan?.id ?? 'free';
      setCurrentPlanId(resolvedCurrentPlanId);

      // Map API plans or fall back to static data
      if (plansData !== null && plansData.length > 0) {
        setPlans(plansData.map((p) => mapApiPlan(p, resolvedCurrentPlanId)));
      } else {
        // Fallback: mark current plan on static plans
        setPlans(
          FALLBACK_PLANS.map((p) => ({
            ...p,
            cta: p.id === resolvedCurrentPlanId ? 'Current Plan' : p.cta,
          }))
        );
      }
    } catch (err) {
      console.error('[PlansPage] Failed to fetch plans:', err);
      setError('Failed to load plans. Using cached data.');
      setPlans(FALLBACK_PLANS);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  async function handleSelectPlan(planId: string): Promise<void> {
    setActionLoading(true);
    try {
      const isCurrentPlan = planId === currentPlanId;
      if (isCurrentPlan) return;

      // If user already has a subscription, change plan; otherwise subscribe
      if (currentPlanId !== 'free') {
        await apiClient.post('/billing/change-plan', { planId });
      } else {
        await apiClient.post('/billing/subscribe', { planId });
      }

      // Refresh to reflect new plan
      await fetchPlans();
    } catch (err) {
      console.error('[PlansPage] Failed to change plan:', err);
    } finally {
      setActionLoading(false);
    }
  }

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

      {/* Error notice (non-blocking — still show plans) */}
      {error !== null && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-amber-600 hover:text-amber-700 hover:bg-amber-100"
            onClick={() => void fetchPlans()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading plans..." />
        </div>
      )}

      {/* Pricing cards */}
      {!loading && plans.length > 0 && (
        <section aria-label="Pricing plans">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billing={billing}
                isCurrent={plan.id === currentPlanId}
                onSelect={handleSelectPlan}
                loading={actionLoading}
              />
            ))}
          </div>
        </section>
      )}

      {/* Feature comparison table */}
      {!loading && plans.length > 0 && (
        <section aria-labelledby="comparison-heading">
          <h2
            id="comparison-heading"
            className="text-lg font-bold text-slate-900 mb-5 text-center"
          >
            Full Feature Comparison
          </h2>
          <ComparisonTable plans={plans} currentPlanId={currentPlanId} />
        </section>
      )}

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
          <Phone className="h-4 w-4" aria-hidden="true" />
          Talk to Sales
        </Button>
      </div>
    </div>
  );
}
