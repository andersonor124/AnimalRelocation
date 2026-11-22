import type { Country, CountryGroup } from '../../shared/types.ts';

export const countries: Country[] = [
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    rabiesStatus: 'controlled',
    authorityName: 'Canadian Food Inspection Agency (CFIA)',
    authorityUrl: 'https://inspection.canada.ca/en/importing-food-plants-or-animals/pets',
    importSummary:
      'Bringing a pet cat or dog into Canada is fairly simple: most need a rabies vaccination certificate and a quick check at the border.',
    quarantineNote: 'No quarantine for pet cats and dogs that meet the requirements.',
    acceptedModes: ['cabin', 'checked', 'cargo'],
    petAirports: 'Any major international airport (e.g. Toronto YYZ, Vancouver YVR, Montréal YUL)',
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    flag: '🇭🇰',
    rabiesStatus: 'free',
    authorityName: 'Agriculture, Fisheries and Conservation Department (AFCD)',
    authorityUrl:
      'https://www.afcd.gov.hk/english/quarantine/qua_ie/qua_ie_ipab/qua_ie_ipab_idc/qua_ie_ipab_idc.html',
    importSummary:
      'Hong Kong sorts countries into groups by rabies risk. You need a Special Permit from AFCD before travel, a vet health certificate signed close to departure, and your pet must fly in as cargo.',
    quarantineNote:
      'Pets from Group I and Group II places that meet every permit condition usually skip quarantine. Pets from Group III places face quarantine (30 days for Group IIIA, longer for others).',
    acceptedModes: ['cargo'],
    petAirports: 'Hong Kong International Airport (HKG) — animals are collected after AFCD inspection',
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    rabiesStatus: 'controlled',
    authorityName: 'CDC (dogs) and USDA APHIS',
    authorityUrl: 'https://www.cdc.gov/importation/dogs/index.html',
    importSummary:
      'Since August 2024 every dog entering the US must be at least 6 months old, microchipped and have a CDC Dog Import Form receipt. Cats have no federal paperwork, but some states and airlines ask for a rabies certificate.',
    quarantineNote: 'No quarantine for healthy pets from low-risk countries. Hawaii has its own much stricter rules.',
    acceptedModes: ['cabin', 'checked', 'cargo'],
    petAirports: 'Most international airports; dogs from high-risk countries must use specific airports',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    rabiesStatus: 'free',
    authorityName: 'Animal and Plant Health Agency (APHA) / GOV.UK',
    authorityUrl: 'https://www.gov.uk/bring-pet-to-great-britain',
    importSummary:
      'Great Britain needs a microchip, a rabies vaccine at least 21 days before travel, an animal health certificate, and (for dogs) a tapeworm treatment 1–5 days before arrival. Pets must arrive by an approved route, which for flights normally means cargo.',
    quarantineNote: 'No quarantine if all rules are met; pets that fail the checks can be quarantined at your cost.',
    acceptedModes: ['cargo'],
    petAirports: 'Approved routes only — e.g. London Heathrow Animal Reception Centre',
  },
  {
    code: 'EU',
    name: 'European Union',
    flag: '🇪🇺',
    rabiesStatus: 'controlled',
    authorityName: 'European Commission (EU pet travel rules, Reg. 576/2013)',
    authorityUrl: 'https://food.ec.europa.eu/animals/movement-pets_en',
    importSummary:
      'Coming from a "listed" country (like Canada, the US, the UK, Hong Kong or Japan) you need a microchip, a rabies vaccine at least 21 days old and an EU animal health certificate endorsed by the government vet. Some countries add their own rules (e.g. tapeworm treatment for dogs to Ireland, Finland, Malta).',
    quarantineNote: 'No quarantine if all rules are met.',
    acceptedModes: ['cabin', 'checked', 'cargo'],
    petAirports: 'Must enter through a travellers’ point of entry with a customs pet check',
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    rabiesStatus: 'free',
    authorityName: 'Department of Agriculture, Fisheries and Forestry (DAFF)',
    authorityUrl: 'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs',
    importSummary:
      'Australia is one of the strictest places to bring a pet. From most countries you need a rabies blood test (RNATT) at least 180 days before export, an import permit, many vet treatments and a minimum 10-day stay at the Mickleham quarantine station in Melbourne.',
    quarantineNote:
      'Minimum 10 days at the Mickleham Post-Entry Quarantine facility (longer, e.g. 30 days, if requirements such as the identity check are not met).',
    acceptedModes: ['cargo'],
    petAirports: 'Melbourne (MEL) only, then transfer to Mickleham quarantine',
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    rabiesStatus: 'free',
    authorityName: 'Animal & Veterinary Service (AVS), NParks',
    authorityUrl: 'https://avs.nparks.gov.sg/pets/importing-exporting-a-pet/import/dogs-and-cats/',
    importSummary:
      'Singapore groups countries by rabies risk (rules were updated in 2024). You need a pet licence and an import licence from AVS before arrival, a vet health certificate endorsed by the government, and your pet arrives as cargo at Changi.',
    quarantineNote:
      'Often no quarantine for compliant pets from low-risk countries, but this depends on your origin’s category — check the AVS schedule for your country.',
    acceptedModes: ['cargo'],
    petAirports: 'Changi Airport (SIN) — Changi Animal and Plant Quarantine',
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    rabiesStatus: 'free',
    authorityName: 'Animal Quarantine Service (AQS), MAFF',
    authorityUrl: 'https://www.maff.go.jp/aqs/english/animal/dog/import-other.html',
    importSummary:
      'From most countries Japan needs a microchip, two rabies shots, a rabies blood test, and then a 180-day wait from the blood test before arrival. You must also notify the Animal Quarantine Service at least 40 days before arrival.',
    quarantineNote:
      'If every step is done correctly, the inspection at the airport takes up to about 12 hours. If not, quarantine can last up to 180 days.',
    acceptedModes: ['cabin', 'checked', 'cargo'],
    petAirports: 'Airports with an Animal Quarantine Service office (e.g. Narita NRT, Haneda HND, Kansai KIX)',
  },
];

const g = (destCode: string, group: string, label: string, origins: string[]): CountryGroup[] =>
  origins.map((originCode) => ({ destCode, originCode, group, label }));

/** How each destination classifies each origin. */
export const countryGroups: CountryGroup[] = [
  // Hong Kong (AFCD): Group I = rabies-free places, Group II = rabies-controlled places.
  ...g('HK', 'I', 'Hong Kong treats this as a "Group I" place (very low rabies risk)', ['GB', 'AU', 'JP']),
  ...g('HK', 'II', 'Hong Kong treats this as a "Group II" place (rabies controlled)', ['CA', 'US', 'SG', 'EU']),
  // Canada (CFIA)
  ...g('CA', 'rabies-free', 'Canada treats this as a rabies-free country', ['GB', 'AU', 'JP']),
  ...g('CA', 'other', 'Canada needs a rabies certificate for pets from here', ['US', 'HK', 'SG', 'EU']),
  // United States (CDC dog rules)
  ...g('US', 'low-risk', 'The CDC treats this as a dog-rabies-free or low-risk country', [
    'CA', 'GB', 'EU', 'AU', 'JP', 'SG', 'HK',
  ]),
  // Great Britain (listed countries)
  ...g('GB', 'listed', 'Great Britain treats this as a "listed" country (no rabies blood test needed)', [
    'CA', 'US', 'EU', 'AU', 'JP', 'SG', 'HK',
  ]),
  // EU (listed third countries)
  ...g('EU', 'listed', 'The EU treats this as a "listed" country (no rabies blood test needed)', [
    'CA', 'US', 'GB', 'AU', 'JP', 'SG', 'HK',
  ]),
  // Australia (DAFF approved-country groups)
  ...g('AU', 'group2', 'Australia treats this as a "Group 2" (rabies-free) country', ['JP', 'SG']),
  ...g('AU', 'group3', 'Australia treats this as a "Group 3" country — rabies blood test and 180-day wait needed', [
    'CA', 'US', 'GB', 'EU', 'HK',
  ]),
  // Japan (AQS)
  ...g('JP', 'designated', 'Japan treats this as a "designated" rabies-free region', ['AU']),
  ...g('JP', 'non-designated', 'Japan treats this as a "non-designated" region — two rabies shots, blood test and 180-day wait', [
    'CA', 'US', 'GB', 'EU', 'SG', 'HK',
  ]),
  // Singapore (AVS) — simplified into rabies-free vs. other approved countries.
  ...g('SG', 'rabies-free', 'Singapore treats this as a low-risk, rabies-free country', ['AU', 'GB', 'JP', 'HK']),
  ...g('SG', 'other', 'Singapore treats this as a rabies-controlled country — extra rabies steps needed', [
    'CA', 'US', 'EU',
  ]),
];
