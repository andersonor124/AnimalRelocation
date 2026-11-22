// All rules, countries, airlines and glossary content. The app imports this directly.
// Edit these files and push — the site redeploys automatically.
import { airlineRoutes, airlines } from './airlines.ts';
import { countries, countryGroups } from './countries.ts';
import { exportRequirements } from './exports.ts';
import { generalRequirements } from './general.ts';
import { glossary } from './glossary.ts';
import { hkRequirements } from './import-hk.ts';
import { otherImportRequirements } from './import-others.ts';

export const requirements = [
  ...generalRequirements,
  ...exportRequirements,
  ...hkRequirements,
  ...otherImportRequirements,
];

export { airlineRoutes, airlines, countries, countryGroups, glossary };
