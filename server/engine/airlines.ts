// Picks the airlines that can fly a pet on a route and explains why others can't.
import type { Airline, AirlineOption, AirlineRoute, Country, TransportMode } from '../../shared/types.ts';

export function filterAirlines(
  airlines: Airline[],
  routes: AirlineRoute[],
  origin: Country,
  dest: Country,
  snubNosed: boolean,
): { suitable: AirlineOption[]; unsuitable: AirlineOption[] } {
  const suitable: AirlineOption[] = [];
  const unsuitable: AirlineOption[] = [];
  for (const a of airlines) {
    if (!a.serves.includes(origin.code) || !a.serves.includes(dest.code)) continue;
    const route = routes.find(
      (r) => r.airlineCode === a.code && r.originCode === origin.code && r.destCode === dest.code,
    );
    const usableModes: TransportMode[] = a.modes.filter(
      (m) => dest.acceptedModes.includes(m) && origin.acceptedModes.includes(m),
    );
    const warnings: string[] = [];
    if (usableModes.length === 0) {
      warnings.push(
        `${dest.name} only accepts pets arriving as ${dest.acceptedModes.join(' or ')}, which ${a.name} does not offer.`,
      );
    }
    if (snubNosed && a.snubNosed === 'banned') {
      warnings.push(`${a.name} does not accept snub-nosed (flat-faced) breeds in the hold.`);
    } else if (snubNosed && a.snubNosed === 'restricted') {
      warnings.push('Snub-nosed breeds face restrictions — confirm with the airline before booking.');
    }
    const blocked = usableModes.length === 0 || (snubNosed && a.snubNosed === 'banned' && !usableModes.includes('cabin'));
    const option: AirlineOption = { ...a, usableModes, route, warnings };
    (blocked ? unsuitable : suitable).push(option);
  }
  // Airlines with a known route note (e.g. a nonstop) first, then those with fewer warnings.
  const rank = (a: AirlineOption) => a.route?.rank ?? 1000;
  suitable.sort((x, y) => rank(x) - rank(y) || x.warnings.length - y.warnings.length);
  return { suitable, unsuitable };
}
