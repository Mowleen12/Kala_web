export interface ApplyFormFields {
  experienceYears: string;
  city: string;
  skills: string;
}

export type ApplyFormErrors = Partial<Record<keyof ApplyFormFields, string>>;

/** Experience, city and at least one skill are required; reel/portfolio/statement are not. */
export function validateApplyForm(f: ApplyFormFields): ApplyFormErrors {
  const errors: ApplyFormErrors = {};
  const years = f.experienceYears.trim();
  if (!years) {
    errors.experienceYears = 'Years of experience is required';
  } else {
    const n = Number(years);
    if (!Number.isFinite(n) || n < 0 || n > 70) {
      errors.experienceYears = 'Enter a number between 0 and 70';
    }
  }
  if (!f.city.trim()) errors.city = 'City is required';
  if (!f.skills.split(',').some((s) => s.trim())) errors.skills = 'Add at least one skill';
  return errors;
}
