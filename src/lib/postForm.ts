export interface PostFormFields {
  title: string;
  category: string;
  venue: string;
  city: string;
  college: string;
  startDate: string;
  endDate: string;
  description: string;
  imageUrl: string;
  priceChoice: string;
  customMin: string;
  customMax: string;
}

export type PostFormErrors = Partial<Record<keyof PostFormFields, string>>;

/** Core-7 required fields; honorarium bounds only when "Your own price" is picked. Society posts additionally require the college (spec 2026-10-27). */
export function validatePostForm(f: PostFormFields, society = false): PostFormErrors {
  const errors: PostFormErrors = {};
  const title = f.title.trim();
  if (title.length < 3) errors.title = 'Title must be at least 3 characters';
  else if (title.length > 300) errors.title = 'Title must be 300 characters or fewer';
  if (!f.category.trim()) errors.category = 'Pick a category discipline';
  if (!f.venue.trim()) errors.venue = 'Venue is required';
  if (!f.city.trim()) errors.city = 'City & state is required';
  if (society && !f.college.trim()) errors.college = 'College / institution is required';
  if (!f.startDate) errors.startDate = 'Event start date is required';
  else if (f.endDate && f.endDate < f.startDate) errors.endDate = 'End date cannot be before the start date';
  if (!f.description.trim()) errors.description = 'Add a short synopsis of the call';
  if (!f.imageUrl) errors.imageUrl = 'Choose or upload a banner';
  if (f.priceChoice === 'custom') {
    const min = Number(f.customMin);
    const max = Number(f.customMax);
    if (!f.customMin || Number.isNaN(min) || min < 0) errors.customMin = 'Enter a minimum honorarium';
    else if (!f.customMax || Number.isNaN(max) || max < 0) errors.customMax = 'Enter a maximum honorarium';
    else if (max < min) errors.customMax = 'Maximum must be greater than or equal to the minimum';
  }
  return errors;
}
