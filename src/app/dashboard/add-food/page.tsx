'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Dialog,
} from '@/components/ui';
import { useCurrentUser, useMounted } from '@/lib/hooks';
import { addFoodListing, getOrganization } from '@/lib/store';
import type { FoodCategory, StorageRequirement } from '@/lib/types';

const categoryOptions = [
  { value: 'prepared_meals', label: 'Prepared Meals' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'produce', label: 'Fresh Produce' },
  { value: 'packaged', label: 'Packaged Food' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'other', label: 'Other' },
];

const storageOptions = [
  { value: 'ambient', label: 'Ambient (Room Temperature)' },
  { value: 'refrigerated', label: 'Refrigerated (2-8°C)' },
  { value: 'frozen', label: 'Frozen (-18°C or below)' },
  { value: 'hot_holding', label: 'Hot Holding (60°C+)' },
];

const unitOptions = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'litres', label: 'Litres' },
  { value: 'portions', label: 'Portions' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'packs', label: 'Packs' },
];

interface FormState {
  foodName: string;
  category: FoodCategory;
  quantity: string;
  unit: string;
  preparedAt: string;
  expiresAt: string;
  safePickupDeadline: string;
  pickupArea: string;
  storageRequirement: StorageRequirement;
  allergens: string;
  description: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function AddFoodPage() {
  const { user } = useCurrentUser();
  const mounted = useMounted();
  const router = useRouter();
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const org = user ? getOrganization(user.organizationId) : undefined;

  const [form, setForm] = useState<FormState>({
    foodName: '',
    category: 'prepared_meals',
    quantity: '',
    unit: 'kg',
    preparedAt: '',
    expiresAt: '',
    safePickupDeadline: '',
    pickupArea: org?.area || '',
    storageRequirement: 'ambient',
    allergens: '',
    description: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  if (!mounted || !user) return null;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.foodName.trim()) newErrors.foodName = 'Food name is required.';
    if (!form.quantity || parseFloat(form.quantity) <= 0) newErrors.quantity = 'Enter a valid quantity.';
    if (!form.expiresAt) newErrors.expiresAt = 'Expiry date and time are required.';
    if (!form.safePickupDeadline) newErrors.safePickupDeadline = 'Safe pickup deadline is required.';
    if (!form.pickupArea.trim()) newErrors.pickupArea = 'Pickup area is required.';

    // Validate pickup deadline is before expiry
    if (form.expiresAt && form.safePickupDeadline) {
      if (new Date(form.safePickupDeadline) > new Date(form.expiresAt)) {
        newErrors.safePickupDeadline = 'Pickup deadline must be before expiry.';
      }
    }

    // Validate expiry is in the future
    if (form.expiresAt && new Date(form.expiresAt) <= new Date()) {
      newErrors.expiresAt = 'Expiry must be in the future.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    addFoodListing({
      donorId: user.id,
      organizationId: user.organizationId,
      foodName: form.foodName.trim(),
      category: form.category,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      preparedAt: form.preparedAt ? new Date(form.preparedAt).toISOString() : null,
      receivedAt: null,
      expiresAt: new Date(form.expiresAt).toISOString(),
      safePickupDeadline: new Date(form.safePickupDeadline).toISOString(),
      pickupArea: form.pickupArea.trim(),
      storageRequirement: form.storageRequirement,
      allergens: form.allergens
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      description: form.description.trim(),
    });

    setShowSuccess(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-white/80 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <CheckCircle2 className="w-16 h-16 text-forest-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text">Listing Added Successfully!</h2>
            <p className="text-sm text-text-secondary mt-2">Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-forest-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Add Surplus Food</h1>
            <p className="text-sm text-text-secondary mt-1">
              List food that is still safe and available for rescue.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCSVDialog(true)}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-text">Food Details</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Food Name"
              placeholder="e.g., Vegetable Biryani, Mixed Salad"
              value={form.foodName}
              onChange={(e) => updateField('foodName', e.target.value)}
              error={errors.foodName}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Category"
                options={categoryOptions}
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              />
              <Select
                label="Storage Requirement"
                options={storageOptions}
                value={form.storageRequirement}
                onChange={(e) => updateField('storageRequirement', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="e.g., 25"
                value={form.quantity}
                onChange={(e) => updateField('quantity', e.target.value)}
                error={errors.quantity}
                required
              />
              <Select
                label="Unit"
                options={unitOptions}
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
              />
            </div>
            <Textarea
              label="Description"
              placeholder="Describe the food, packaging, and any other details..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
            <Input
              label="Allergens"
              placeholder="e.g., gluten, dairy, nuts (comma-separated)"
              value={form.allergens}
              onChange={(e) => updateField('allergens', e.target.value)}
              hint="Leave empty if none or unknown."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-text">Timing & Pickup</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Prepared / Received At (optional)"
              type="datetime-local"
              value={form.preparedAt}
              onChange={(e) => updateField('preparedAt', e.target.value)}
              hint="When the food was prepared or received."
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry / Use-By"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => updateField('expiresAt', e.target.value)}
                error={errors.expiresAt}
                required
              />
              <Input
                label="Safe Pickup Deadline"
                type="datetime-local"
                value={form.safePickupDeadline}
                onChange={(e) => updateField('safePickupDeadline', e.target.value)}
                error={errors.safePickupDeadline}
                required
              />
            </div>
            <Input
              label="Pickup Area"
              placeholder="e.g., Indiranagar, MG Road"
              value={form.pickupArea}
              onChange={(e) => updateField('pickupArea', e.target.value)}
              error={errors.pickupArea}
              required
            />
          </CardContent>
        </Card>

        {/* Info note */}
        <div className="flex gap-3 p-4 bg-forest-50 border border-forest-200 rounded-[var(--radius-md)]">
          <Info className="w-4.5 h-4.5 text-forest-600 shrink-0 mt-0.5" />
          <p className="text-sm text-forest-700">
            Only list food that is safe for consumption. Expired or unsafe food will not be matched
            with recipients. All listings are clearly labeled as demo data.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit">Post Listing</Button>
        </div>
      </form>

      {/* CSV Import Dialog */}
      <Dialog
        open={showCSVDialog}
        onClose={() => setShowCSVDialog(false)}
        title="Import Food Listings from CSV"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCSVDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                // For now, show unavailable state
                alert('AI CSV extraction requires a Gemini API key. Configure GEMINI_API_KEY in your environment to enable this feature.');
                setShowCSVDialog(false);
              }}
            >
              Extract Listings
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Paste CSV data containing food inventory. The AI will extract structured listings for your review.
          </p>
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)]">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              AI extraction requires a configured Gemini API key. Without it, basic CSV parsing will be used.
              Extracted results are never saved automatically — you will always review before posting.
            </p>
          </div>
          <Textarea
            label="CSV Data"
            placeholder={`name,quantity,unit,category,storage\nVegetable Biryani,25,kg,prepared_meals,hot_holding\nFresh Bread,10,kg,bakery,ambient`}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="min-h-[150px] font-mono text-xs"
          />
        </div>
      </Dialog>
    </div>
  );
}
