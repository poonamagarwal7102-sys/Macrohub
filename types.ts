
export interface YearlyData {
  year: number;
  
  // Leading (Predictive)
  pmi: number;                // Purchasing Managers’ Index (>50 expansion)
  cci: number;                // Consumer Confidence Index
  stockMarketPerf: number;    // % change
  buildingPermits: string;    // Volume or index
  yieldCurve: string;         // e.g., "Inverted", "Steep", "Flat"
  joblessClaims: string;      // Trend (Stable/Rising/Falling)
  m2MoneySupply: number;      // % growth
  newOrdersDurable: number;   // % growth

  // Coincident (Real-Time)
  gdpGrowth: number;
  personalIncomeGrowth: number;
  industrialProduction: number; // % change
  retailSales: number;        // % change
  tradeSales: number;         // % change
  digitalTransactionVol: number; // % growth

  // Lagging (Confirming)
  cpi: number;                // Inflation
  ppi: number;                // Producer Inflation
  unemploymentRate: number;
  interestRate: number;       // Central Bank rate
  laborCostPerUnit: number;   // % change
  corporateProfits: number;   // % change
  tradeBalance: string;       // Surplus/Deficit description

  // Modern & Digital (2026 Specific)
  aiProductivityIndex: number; // 0-100 score
  ecommercePenetration: number; // % of total retail
  cyberResilienceSpending: number; // % growth
  gigEconomyPart: number;      // % of workforce
  mobilityData: number;        // Traffic index (relative to baseline)
}

export interface CountryMacroData {
  countryName: string;
  currency: string;
  currentGDP: string;
  lastUpdated: string;
  historicalData: YearlyData[];
  sources: { title: string; uri: string }[];
  isSearchGrounded: boolean; // Flag to indicate if search grounding was successful
}

export enum Region {
  NorthAmerica = 'North America',
  CentralAmerica = 'Central America',
  SouthAmerica = 'South America',
  Asia = 'Asia',
  Africa = 'Africa',
  Europe = 'Europe',
}

export interface CountryConfig {
  id: string;
  name: string;
  region: Region;
}
