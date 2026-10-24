'use client';

import { useMemo } from 'react';
import {
  BarChart3,
  Leaf as LeafIcon,
  Utensils,
  Weight,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardContent, StatCard, Badge, EmptyState } from '@/components/ui';
import { useImpactRecords, useOrganizations, useMounted } from '@/lib/hooks';
import { categoryLabel } from '@/lib/utils';

const CHART_COLORS = ['#166429', '#3d9a4f', '#6bb87a', '#a8d630', '#c0e45c', '#edf8c8', '#d4ead7'];

export default function ImpactPage() {
  const impacts = useImpactRecords();
  const orgs = useOrganizations();
  const mounted = useMounted();

  const summary = useMemo(() => {
    const totalKg = impacts.reduce((s, i) => s + i.quantityKg, 0);
    const totalMeals = impacts.reduce((s, i) => s + i.estimatedMeals, 0);
    const totalCO2 = impacts.reduce((s, i) => s + i.estimatedCO2SavedKg, 0);

    // By category
    const byCategory = Object.entries(
      impacts.reduce(
        (acc, i) => {
          acc[i.category] = (acc[i.category] || 0) + i.quantityKg;
          return acc;
        },
        {} as Record<string, number>
      )
    ).map(([key, value]) => ({
      name: categoryLabel(key),
      value: Math.round(value * 10) / 10,
    }));

    // By recipient org
    const byRecipient = Object.entries(
      impacts.reduce(
        (acc, i) => {
          acc[i.recipientOrgId] = (acc[i.recipientOrgId] || 0) + i.quantityKg;
          return acc;
        },
        {} as Record<string, number>
      )
    ).map(([orgId, value]) => ({
      name: orgs.find((o) => o.id === orgId)?.name || orgId,
      value: Math.round(value * 10) / 10,
    }));

    // By donor org
    const byDonor = Object.entries(
      impacts.reduce(
        (acc, i) => {
          acc[i.donorOrgId] = (acc[i.donorOrgId] || 0) + i.quantityKg;
          return acc;
        },
        {} as Record<string, number>
      )
    ).map(([orgId, value]) => ({
      name: orgs.find((o) => o.id === orgId)?.name || orgId,
      value: Math.round(value * 10) / 10,
    }));

    return { totalKg, totalMeals, totalCO2, byCategory, byRecipient, byDonor };
  }, [impacts, orgs]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Impact Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Outcomes from completed rescues. Only delivered food is counted.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-3 p-3 bg-lime-50 border border-lime-200 rounded-[var(--radius-md)]">
        <Info className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
        <p className="text-xs text-forest-700">
          Demo Mode: These figures are derived from simulated demo transactions and do not represent
          verified real-world impact. Meal and CO₂ estimates use standard conversion factors.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Rescues"
          value={impacts.length}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Food Rescued"
          value={`${summary.totalKg} kg`}
          icon={<Weight className="w-5 h-5" />}
        />
        <StatCard
          label="Estimated Meals"
          value={summary.totalMeals}
          icon={<Utensils className="w-5 h-5" />}
        />
        <StatCard
          label="CO₂ Saved (est.)"
          value={`${summary.totalCO2} kg`}
          icon={<LeafIcon className="w-5 h-5" />}
        />
      </div>

      {impacts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<BarChart3 className="w-12 h-12" />}
              title="No impact data yet"
              description="Complete a rescue — from acceptance through delivery — to see impact metrics here."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* By Category */}
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-text">Food Rescued by Category</h2>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.byCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}kg`}
                        labelLine={false}
                      >
                        {summary.byCategory.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e2db',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* By Donor */}
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-text">Contributions by Donor</h2>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.byDonor} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
                      <XAxis type="number" unit=" kg" tick={{ fontSize: 12, fill: '#5c5c57' }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fontSize: 11, fill: '#5c5c57' }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e2db',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                      />
                      <Bar dataKey="value" fill="#166429" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent rescues */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-text">Completed Rescues</h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">Food</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">Category</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">Quantity</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">Meals</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">CO₂ Saved</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impacts.map((impact) => (
                      <tr key={impact.id} className="border-b border-border-subtle last:border-0">
                        <td className="py-2.5 px-3 font-medium text-text">{impact.foodName}</td>
                        <td className="py-2.5 px-3 text-text-secondary">
                          <Badge variant="outline" className="text-[10px]">
                            {categoryLabel(impact.category)}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right text-text">{impact.quantityKg} kg</td>
                        <td className="py-2.5 px-3 text-right text-text">{impact.estimatedMeals}</td>
                        <td className="py-2.5 px-3 text-right text-forest-600">{impact.estimatedCO2SavedKg} kg</td>
                        <td className="py-2.5 px-3 text-text-muted text-xs">
                          {new Date(impact.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
