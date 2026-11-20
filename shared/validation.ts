import { z } from 'zod';
import type { ScenarioInput } from './types.js';

const iataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Must be a valid 3-letter IATA airport code');

export const scenarioInputSchema: z.ZodType<ScenarioInput> = z.object({
  scenarioName: z.string().trim().min(1).max(80),
  origin: iataSchema,
  destination: iataSchema,
  itineraryType: z.enum(['direct', 'one-stop', 'multi-leg']),
  connectionHub: iataSchema,
  layoverMinutes: z.number().finite().min(0).max(1440),
  lateEveningArrival: z.boolean(),
  forcedOvernightLayover: z.boolean(),
  layoverOvernightCost: z.number().finite().min(0).max(1500),

  annualPassPrice: z.number().finite().min(0).max(5000),
  plannedRoundtrips: z.number().int().min(1).max(50),
  passAlreadySunk: z.boolean(),

  baseFarePerSegment: z.number().finite().min(0).max(500),
  taxesFeesPerSegment: z.number().finite().min(0).max(300),
  carryOnPerDirection: z.number().finite().min(0).max(250),
  checkedBagPerDirection: z.number().finite().min(0).max(250),
  seatOrBundlePerDirection: z.number().finite().min(0).max(300),
  earlyBookingEnabled: z.boolean(),
  earlyBookingFeePerDirection: z.number().finite().min(0).max(300),

  accommodationMode: z.enum(['hostel', 'hotel', 'family']),
  nightsPerTrip: z.number().int().min(0).max(30),
  nightlyLodgingRate: z.number().finite().min(0).max(2000),
  groundTransitPerTrip: z.number().finite().min(0).max(1000),
  layoverBufferPerTrip: z.number().finite().min(0).max(500),

  baselineRoundtripFare: z.number().finite().min(0).max(5000),
  baselineBaggageFees: z.number().finite().min(0).max(1000),

  fallbackLegProbability: z.number().finite().min(0).max(0.8),
  fallbackOneWayFare: z.number().finite().min(0).max(2500),
  unplannedOvernightCost: z.number().finite().min(0).max(1500),
});

export function validateScenarioInput(data: unknown) {
  return scenarioInputSchema.safeParse(data);
}
