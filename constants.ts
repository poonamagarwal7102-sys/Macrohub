
import { Region, CountryConfig } from './types';

export const COUNTRIES: CountryConfig[] = [
  { id: 'usa', name: 'United States', region: Region.NorthAmerica },
  { id: 'canada', name: 'Canada', region: Region.NorthAmerica },
  { id: 'mexico', name: 'Mexico', region: Region.NorthAmerica },
  { id: 'costa-rica', name: 'Costa Rica', region: Region.CentralAmerica },
  { id: 'el-salvador', name: 'El Salvador', region: Region.CentralAmerica },
  { id: 'guatemala', name: 'Guatemala', region: Region.CentralAmerica },
  { id: 'honduras', name: 'Honduras', region: Region.CentralAmerica },
  { id: 'nicaragua', name: 'Nicaragua', region: Region.CentralAmerica },
  { id: 'chile', name: 'Chile', region: Region.SouthAmerica },
  { id: 'china', name: 'China', region: Region.Asia },
  { id: 'india', name: 'India', region: Region.Asia },
  { id: 'japan', name: 'Japan', region: Region.Asia },
  { id: 'uk', name: 'United Kingdom', region: Region.Europe },
  { id: 'botswana', name: 'Botswana', region: Region.Africa },
  { id: 'ghana', name: 'Ghana', region: Region.Africa },
  { id: 'kenya', name: 'Kenya', region: Region.Africa },
  { id: 'lesotho', name: 'Lesotho', region: Region.Africa },
  { id: 'malawi', name: 'Malawi', region: Region.Africa },
  { id: 'mozambique', name: 'Mozambique', region: Region.Africa },
  { id: 'namibia', name: 'Namibia', region: Region.Africa },
  { id: 'nigeria', name: 'Nigeria', region: Region.Africa },
  { id: 'south-africa', name: 'South Africa', region: Region.Africa },
  { id: 'swaziland', name: 'Swaziland (Eswatini)', region: Region.Africa },
  { id: 'tanzania', name: 'Tanzania', region: Region.Africa },
  { id: 'uganda', name: 'Uganda', region: Region.Africa },
];

export const REGIONS = [
  Region.NorthAmerica,
  Region.CentralAmerica,
  Region.SouthAmerica,
  Region.Asia,
  Region.Africa,
  Region.Europe,
];
