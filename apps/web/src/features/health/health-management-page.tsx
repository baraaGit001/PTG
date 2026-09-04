import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Button, Card, Input, toast } from '@ptg/ui';
import {
  ACTIVITY_LEVELS,
  HEALTH_GOALS,
  type ActivityLevel,
  type Gender,
  type HealthGoal,
  type UpdateHealthProfileRequest,
} from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { useHealthProfile, useUpdateHealthProfile } from './api';

/**
 * The app's Health Management screen: a Basic Profile card, a Health Goals
 * card, and one dark Save Profile button - not a generic two-column form.
 *
 * Weights are stored in grams (see `HealthProfileDto`) but the app shows and
 * edits kilograms, so every weight crosses this boundary through `toKg` /
 * `toGrams`.
 */

const GENDER_TOGGLE: Gender[] = ['MALE', 'FEMALE'];

function toKg(grams: number | null | undefined): string {
  if (grams == null) return '';
  return String(Math.round(grams / 100) / 10);
}

function toGrams(kg: string): number | null {
  const parsed = Number.parseFloat(kg);
  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : null;
}

export default function HealthManagementPage() {
  const { t } = useTranslation();
  const profileQuery = useHealthProfile();
  const updateProfile = useUpdateHealthProfile();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">{t('nav.healthManagement')}</h1>
        <p className="text-sm text-muted-foreground">{t('health.managementPageSubtitle')}</p>
      </header>

      <QueryState
        isLoading={profileQuery.isLoading}
        isError={profileQuery.isError}
        error={profileQuery.error}
        onRetry={() => profileQuery.refetch()}
        skeletonVariant="detail"
      >
        {profileQuery.data ? (
          <ProfileForm
            profile={profileQuery.data}
            isSaving={updateProfile.isPending}
            onSave={(values) => updateProfile.mutate(values, { onSuccess: () => toast.success(t('common.save')) })}
          />
        ) : null}
      </QueryState>

      <p className="text-2xs text-muted-foreground">{t('health.notMedicalAdvice')}</p>
    </div>
  );
}

interface ProfileFormProps {
  profile: {
    gender: Gender;
    birthDate: string | null;
    heightCm: number | null;
    weightGrams: number | null;
    activityLevel: ActivityLevel;
    goal: HealthGoal;
    targetWeightGrams: number | null;
  };
  isSaving: boolean;
  onSave: (values: UpdateHealthProfileRequest) => void;
}

function ProfileForm({ profile, isSaving, onSave }: ProfileFormProps) {
  const { t } = useTranslation();
  const [gender, setGender] = React.useState<Gender>(profile.gender);
  const [birthDate, setBirthDate] = React.useState(profile.birthDate?.slice(0, 10) ?? '');
  const [heightCm, setHeightCm] = React.useState(profile.heightCm == null ? '' : String(profile.heightCm));
  const [weightKg, setWeightKg] = React.useState(toKg(profile.weightGrams));
  const [goal, setGoal] = React.useState<HealthGoal>(profile.goal);
  const [activityLevel, setActivityLevel] = React.useState<ActivityLevel>(profile.activityLevel);
  const [targetWeightKg, setTargetWeightKg] = React.useState(toKg(profile.targetWeightGrams));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          gender,
          birthDate: birthDate || null,
          heightCm: heightCm ? Number.parseInt(heightCm, 10) : null,
          weightGrams: toGrams(weightKg),
          goal,
          activityLevel,
          targetWeightGrams: toGrams(targetWeightKg),
        });
      }}
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t('health.basicProfile')}</h2>
        <Card className="divide-y divide-border">
          <Row label={t('health.height')}>
            <MeasureInput value={heightCm} onChange={setHeightCm} unit="cm" inputMode="numeric" />
          </Row>
          <Row label={t('health.weight')}>
            <MeasureInput value={weightKg} onChange={setWeightKg} unit="kg" inputMode="decimal" />
          </Row>
          <Row label={t('health.gender')}>
            <div className="flex rounded-lg bg-muted p-1">
              {GENDER_TOGGLE.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(option)}
                  aria-pressed={gender === option}
                  className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                    gender === option ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t(`health.genderOption.${option}`)}
                </button>
              ))}
            </div>
          </Row>
          <Row label={t('health.dateOfBirth')}>
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              aria-label={t('health.dateOfBirth')}
              className="num bg-transparent text-right text-sm font-medium text-primary outline-none"
            />
          </Row>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t('health.healthGoals')}</h2>
        <Card className="divide-y divide-border">
          <Row label={t('health.currentGoal')}>
            <ChoiceSelect
              label={t('health.currentGoal')}
              value={goal}
              options={HEALTH_GOALS}
              onChange={setGoal}
              renderOption={(option) => t(`health.goalOption.${option}`)}
            />
          </Row>
          <Row label={t('health.dailyActivity')}>
            <ChoiceSelect
              label={t('health.dailyActivity')}
              value={activityLevel}
              options={ACTIVITY_LEVELS}
              onChange={setActivityLevel}
              renderOption={(option) => t(`health.activityOption.${option}`)}
            />
          </Row>
          <Row label={t('health.targetWeight')}>
            <MeasureInput value={targetWeightKg} onChange={setTargetWeightKg} unit="kg" inputMode="decimal" />
          </Row>
        </Card>
      </section>

      <Button
        type="submit"
        loading={isSaving}
        className="h-12 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
      >
        {t('health.saveProfile')}
      </Button>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      {children}
    </div>
  );
}

interface MeasureInputProps {
  value: string;
  onChange: (value: string) => void;
  unit: string;
  inputMode: 'numeric' | 'decimal';
}

/** The app shows a measurement as a right-aligned pill with the unit outside it. */
function MeasureInput({ value, onChange, unit, inputMode }: MeasureInputProps) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
      <Input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        aria-label={unit}
        className="num h-auto w-16 border-0 bg-transparent p-0 text-right text-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
      />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </span>
  );
}

interface ChoiceSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  renderOption: (option: T) => string;
}

/**
 * Renders as the app's "value ›" row: a native select is invisible on top of
 * the label, so the whole row opens the picker and mobile gets its own wheel.
 */
function ChoiceSelect<T extends string>({ label, value, options, onChange, renderOption }: ChoiceSelectProps<T>) {
  return (
    <span className="relative flex items-center gap-1 text-sm font-medium text-foreground">
      {renderOption(value)}
      <ChevronRight className="size-4 text-muted-foreground" />
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value as T)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {renderOption(option)}
          </option>
        ))}
      </select>
    </span>
  );
}
