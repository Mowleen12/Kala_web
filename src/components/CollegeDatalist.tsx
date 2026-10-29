import { DELHI_COLLEGES } from '../lib/colleges';

export const COLLEGE_DATALIST_ID = 'kala-college-options';

export const CollegeDatalist = () => (
  <datalist id={COLLEGE_DATALIST_ID}>
    {DELHI_COLLEGES.map((c) => (
      <option key={c} value={c} />
    ))}
  </datalist>
);
