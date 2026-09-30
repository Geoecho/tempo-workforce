import { Linking } from 'react-native';
import type { Shift } from './data';

export type SitePin = { latitude: number; longitude: number };

export function parseSitePin(input: string): SitePin | null {
  let value = input.trim();
  try { value = decodeURIComponent(value); } catch { /* Keep the original text. */ }
  const osm = value.match(/#map=\d+\/(-?\d{1,2}(?:\.\d+)?)\/(-?\d{1,3}(?:\.\d+)?)/);
  const pair = value.match(/(?:^|[?&#@=/])\s*(-?\d{1,2}(?:\.\d+)?)\s*[,/]\s*(-?\d{1,3}(?:\.\d+)?)(?=$|[,&/?#])/);
  const google = value.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  const match = google ?? osm ?? pair;
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function siteMapUrl(site: Pick<Shift, 'site' | 'location' | 'latitude' | 'longitude'>, directions = false) {
  const destination = site.latitude !== undefined && site.longitude !== undefined
    ? `${site.latitude},${site.longitude}`
    : `${site.location}, ${site.site}`;
  return directions
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
}

export async function openSiteMap(site: Pick<Shift, 'site' | 'location' | 'latitude' | 'longitude'>, directions = false) {
  await Linking.openURL(siteMapUrl(site, directions));
}
