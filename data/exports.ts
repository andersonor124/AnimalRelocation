import { DEST_HEALTH_CERTS, req } from './helpers.ts';

// What the country you are LEAVING requires: usually a government vet endorsing
// (officially stamping/signing) the destination's health certificate.

const endorse = (
  code: string,
  id: string,
  title: string,
  authority: string,
  how: string,
  estCost: string,
  officialUrl: string,
  extra: Partial<Parameters<typeof req>[2]> = {},
) =>
  req(code, 'export', {
    id,
    title,
    deadlineDays: 1,
    durationDays: 0,
    dependsOn: DEST_HEALTH_CERTS,
    // Pets going to Canada or the US don't need a government-endorsed certificate.
    appliesIf: { destCodes: ['HK', 'GB', 'EU', 'AU', 'JP', 'SG'] },
    what: `After your vet signs the health certificate, ${authority} must check and endorse (officially stamp or sign) it.`,
    why: 'Most destinations only accept a health certificate that a government vet in your departure country has endorsed. Without it your pet can be refused entry.',
    how,
    estCost,
    officialUrl,
    ...extra,
  });

export const exportRequirements = [
  // ---- Canada ----
  req('CA', 'export', {
    id: 'ca-cfia-book',
    title: 'Book your CFIA endorsement appointment',
    deadlineDays: 30,
    critical: false,
    what: 'Reserve a time with your local CFIA office for endorsement of the health certificate.',
    why: 'The health certificate often has to be signed only a few days before departure, so the CFIA appointment has to fit into a small window. Booking early avoids a scramble.',
    how: 'Find your nearest CFIA animal health office on the CFIA website and ask how they accept export certificates (in person, by courier or electronically) and how long they take.',
    officialUrl: 'https://inspection.canada.ca/en/animal-health/terrestrial-animals/exports/pets',
  }),
  endorse(
    'CA',
    'ca-cfia-endorse',
    'Get the health certificate endorsed by CFIA',
    'the Canadian Food Inspection Agency (CFIA)',
    'Take (or courier) the original certificate signed by your accredited vet, plus the rabies certificate and microchip record, to your CFIA office. Check that every page is stamped before you leave.',
    'A CFIA fee applies (see the CFIA fee schedule)',
    'https://inspection.canada.ca/en/animal-health/terrestrial-animals/exports/pets',
  ),
  // ---- United States ----
  endorse(
    'US',
    'us-aphis-endorse',
    'Get the health certificate endorsed by USDA APHIS',
    'USDA APHIS (the US government animal health service)',
    'Your USDA-accredited vet usually submits the certificate electronically through VEHCS. APHIS checks it and endorses it, either electronically or on paper. Ask your vet which applies for your destination.',
    'An APHIS endorsement fee applies (higher if lab tests are included)',
    'https://www.aphis.usda.gov/pet-travel/us-to-another-country-export',
  ),
  // ---- United Kingdom ----
  endorse(
    'GB',
    'gb-ehc',
    'Get an export health certificate (EHC) through APHA',
    'an Official Veterinarian (OV) using the APHA export health certificate',
    'Your vet applies to APHA online for the right export health certificate for your destination. APHA sends it to an Official Veterinarian, who examines your pet and signs it.',
    'Vet / Official Veterinarian fees apply',
    'https://www.gov.uk/guidance/export-health-certificates',
  ),
  // ---- EU ----
  endorse(
    'EU',
    'eu-endorse',
    'Get the certificate endorsed by your country’s official vet',
    'the official (state) veterinary service of the EU country you are leaving',
    'Each EU country does this slightly differently. Ask your vet who the competent authority is (e.g. the regional veterinary office) and book early.',
    'Varies by country',
    'https://food.ec.europa.eu/animals/movement-pets_en',
  ),
  // ---- Australia ----
  endorse(
    'AU',
    'au-export-endorse',
    'Get the export certificate endorsed by DAFF',
    'a government vet from the Department of Agriculture, Fisheries and Forestry (DAFF)',
    'Lodge a Notice of Intention to export with DAFF, then book a DAFF vet inspection close to departure. Ask for the destination country’s certificate to be endorsed.',
    'DAFF export fees apply',
    'https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-animals',
  ),
  // ---- Japan ----
  req('JP', 'export', {
    id: 'jp-aqs-export-notice',
    title: 'Tell Japan’s Animal Quarantine Service you are leaving',
    deadlineDays: 8,
    what: 'Notify the Animal Quarantine Service (AQS) office at your departure airport.',
    why: 'In Japan, pets leaving the country also go through an export quarantine inspection, and AQS needs advance notice.',
    how: 'Contact the AQS office at your departure airport (e.g. Narita or Haneda) at least 7 days before departure.',
    officialUrl: 'https://www.maff.go.jp/aqs/english/animal/dog/export.html',
  }),
  endorse(
    'JP',
    'jp-aqs-export',
    'Export inspection by Animal Quarantine Service',
    'the Animal Quarantine Service at the airport',
    'Arrive early on the day of travel (or the day before, as told by AQS) with your pet and paperwork. AQS inspects your pet and issues the export quarantine certificate.',
    'Usually free',
    'https://www.maff.go.jp/aqs/english/animal/dog/export.html',
    { dependsOn: [...DEST_HEALTH_CERTS, 'jp-aqs-export-notice'] },
  ),
  // ---- Singapore ----
  endorse(
    'SG',
    'sg-export-licence',
    'Apply for an AVS export licence and certificate endorsement',
    'the Animal & Veterinary Service (AVS)',
    'Apply for an export licence on the AVS licensing portal and arrange for the health certificate to be endorsed by AVS.',
    'AVS licence fee applies',
    'https://avs.nparks.gov.sg/pets/importing-exporting-a-pet/export/',
  ),
  // ---- Hong Kong ----
  endorse(
    'HK',
    'hk-export-cert',
    'Get an AFCD export health certificate',
    'AFCD (Hong Kong’s Agriculture, Fisheries and Conservation Department)',
    'Apply to AFCD for an export health certificate for your destination. Make an appointment for your pet to be examined by an AFCD vet, then collect the endorsed certificate.',
    'AFCD fee applies',
    'https://www.afcd.gov.hk/english/quarantine/qua_ie/qua_ie_eapao/qua_ie_eapao_ioahc/qua_ie_eapao_ioahc.html',
    { verification: 'reviewed' },
  ),
];
