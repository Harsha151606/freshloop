'use client';

import Link from 'next/link';
import {
  Leaf,
  ArrowRight,
  Clock,
  Users,
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart3,
  ChevronRight,
  Heart,
  Utensils,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-forest-600 rounded-[var(--radius-md)] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-text">
              Fresh<span className="text-forest-600">Loop</span>{' '}
              <span className="text-lime-500 text-sm font-semibold">AI</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#problem" className="text-sm text-text-secondary hover:text-forest-600 transition-colors">
              Problem
            </a>
            <a href="#solution" className="text-sm text-text-secondary hover:text-forest-600 transition-colors">
              Solution
            </a>
            <a href="#how-it-works" className="text-sm text-text-secondary hover:text-forest-600 transition-colors">
              How It Works
            </a>
            <a href="#impact" className="text-sm text-text-secondary hover:text-forest-600 transition-colors">
              Impact
            </a>
          </div>
          <Link href="/demo">
            <Button size="md">
              Try Demo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-50 via-ivory-50 to-lime-50" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/70 border border-forest-200 rounded-full px-4 py-1.5 text-sm font-medium text-forest-700 mb-6">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Food Rescue Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text leading-tight tracking-tight text-balance">
              Rescue food <br />
              <span className="text-forest-600">before it becomes waste</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-xl leading-relaxed">
              FreshLoop AI connects surplus food from restaurants, grocery stores, and caterers with
              NGOs and community kitchens — intelligently prioritized by urgency and matched by
              feasibility.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/demo">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Rescuing Food
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>

          {/* Hero stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Food Wasted Daily in India', value: '68,000 tonnes', icon: Utensils },
              { label: 'Could Feed', value: '190M People', icon: Users },
              { label: 'Carbon Emissions', value: '8-10% Global', icon: TrendingUp },
              { label: 'Rescue Window', value: '2-6 Hours', icon: Clock },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/60 backdrop-blur-sm border border-border-subtle rounded-[var(--radius-lg)] p-4"
              >
                <stat.icon className="w-5 h-5 text-forest-500 mb-2" />
                <p className="text-xl font-bold text-text">{stat.value}</p>
                <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section id="problem" className="py-20 bg-white border-y border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-forest-600 uppercase tracking-wider mb-3">
              The Problem
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text text-balance">
              Edible food is wasted while communities go hungry
            </h2>
            <p className="mt-4 text-text-secondary">
              Restaurants, stores, and caterers routinely discard surplus food that is still safe and
              nutritious — simply because there is no fast, reliable way to redirect it.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Time Pressure',
                description:
                  'Surplus food has a narrow rescue window. Without real-time coordination, perfectly good food expires unused.',
                icon: Clock,
                color: 'text-urgent-orange',
              },
              {
                title: 'Matching Complexity',
                description:
                  'Different organizations need different food types, quantities, and storage. Manual coordination fails at scale.',
                icon: Users,
                color: 'text-forest-600',
              },
              {
                title: 'Lack of Visibility',
                description:
                  'Donors dont know who needs food. Recipients don t know whats available. The information gap wastes resources.',
                icon: BarChart3,
                color: 'text-lime-500',
              },
            ].map((item) => (
              <div key={item.title} className="relative p-6 rounded-[var(--radius-lg)] bg-ivory-50 border border-border-subtle">
                <div className={`${item.color} mb-4`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ── */}
      <section id="solution" className="py-20 bg-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-forest-600 uppercase tracking-wider mb-3">
              The Solution
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text text-balance">
              An intelligent bridge between surplus and need
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Urgency-Based Prioritization',
                description:
                  'Our urgency engine scores every listing by time remaining, perishability, quantity, and storage needs — ensuring the most critical rescues happen first.',
                icon: Zap,
              },
              {
                title: 'Intelligent Matching',
                description:
                  'Automatically matches surplus food with the most suitable recipient based on category compatibility, capacity, distance, and operating hours.',
                icon: ShieldCheck,
              },
              {
                title: 'Decision Room',
                description:
                  'A command-center view that combines urgency, matching, and status into one actionable screen — so coordinators can make fast, informed rescue decisions.',
                icon: BarChart3,
              },
              {
                title: 'End-to-End Tracking',
                description:
                  'From posting to pickup to delivery — every rescue is tracked through clear status transitions, with real impact metrics recorded on completion.',
                icon: Truck,
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-border-subtle rounded-[var(--radius-lg)] p-6 hover:shadow-md hover:border-forest-200 transition-all duration-200"
              >
                <div className="w-10 h-10 bg-forest-50 rounded-[var(--radius-md)] flex items-center justify-center text-forest-600 mb-4">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 bg-white border-y border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-forest-600 uppercase tracking-wider mb-3">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text text-balance">
              Four steps to rescue food
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'List Surplus',
                description: 'Donors post surplus food with quantity, expiry, storage, and pickup details.',
                icon: Utensils,
              },
              {
                step: '02',
                title: 'AI Prioritizes',
                description: 'The urgency engine ranks listings and matches them with the best-fit recipients.',
                icon: Zap,
              },
              {
                step: '03',
                title: 'Accept & Coordinate',
                description: 'Recipients review opportunities and accept available quantities. Volunteers coordinate pickup.',
                icon: Heart,
              },
              {
                step: '04',
                title: 'Deliver & Track',
                description: 'Food is collected, delivered, and the rescue is recorded with real impact metrics.',
                icon: BarChart3,
              },
            ].map((step) => (
              <div
                key={step.step}
                className="relative bg-ivory-50 border border-border-subtle rounded-[var(--radius-lg)] p-6"
              >
                <span className="text-3xl font-bold text-forest-100">{step.step}</span>
                <div className="mt-3 text-forest-600">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-text mt-3 mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Impact / CTA ── */}
      <section id="impact" className="py-20 bg-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-forest-600 to-forest-800 rounded-[var(--radius-xl)] p-10 md:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-balance">
              Every rescue counts
            </h2>
            <p className="mt-4 text-forest-200 text-lg max-w-xl mx-auto">
              Each food rescue prevents waste, feeds people, and reduces carbon emissions. Join the
              loop and start making a measurable difference.
            </p>
            <div className="mt-10 flex justify-center gap-4 flex-col sm:flex-row items-center">
              <Link href="/demo">
                <Button
                  size="lg"
                  className="bg-white text-forest-700 hover:bg-ivory-100 w-full sm:w-auto"
                >
                  Try the Demo
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border-subtle py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-forest-600 rounded-[var(--radius-sm)] flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-text">
                FreshLoop <span className="text-lime-500">AI</span>
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Built for the AI Website Build Sprint. Demo application — no real food transactions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
