import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { renderWithRouter } from './helpers/render';

// Every self-contained CalcShell tool page is mounted here to prove it renders
// without throwing and produces the shared CalcShell frame (an <h1> title). This
// is the cheap, broad complement to tool-pages.test.tsx — which drives the
// example → calc → output path for a representative few. Data/router-bound pages
// (Aerodromes, AerodromeDetail, Airspace, Definitions, MetBrief, RoutePlanner)
// and the multi-export RegLookup are exercised by the Playwright E2E suite, not
// here, because they need live fetches / route params.
import { AiracCycle } from '@/pages/tools/AiracCycle';
import { Altimeter } from '@/pages/tools/Altimeter';
import { ChartSymbols } from '@/pages/tools/ChartSymbols';
import { ClimbGradient } from '@/pages/tools/ClimbGradient';
import { CloudBase } from '@/pages/tools/CloudBase';
import { CriticalPoint } from '@/pages/tools/CriticalPoint';
import { Crosswind } from '@/pages/tools/Crosswind';
import { DensityAltitude } from '@/pages/tools/DensityAltitude';
import { DescentVdp } from '@/pages/tools/DescentVdp';
import { E6b } from '@/pages/tools/E6b';
import { FlightPlan } from '@/pages/tools/FlightPlan';
import { FlightReview } from '@/pages/tools/FlightReview';
import { Fuel } from '@/pages/tools/Fuel';
import { GreatCircle } from '@/pages/tools/GreatCircle';
import { Holding } from '@/pages/tools/Holding';
import { Hydroplaning } from '@/pages/tools/Hydroplaning';
import { Isa } from '@/pages/tools/Isa';
import { Loa } from '@/pages/tools/Loa';
import { Mach } from '@/pages/tools/Mach';
import { MedicalValidity } from '@/pages/tools/MedicalValidity';
import { Metar } from '@/pages/tools/Metar';
import { Notam } from '@/pages/tools/Notam';
import { OneInSixty } from '@/pages/tools/OneInSixty';
import { Part61Currency } from '@/pages/tools/Part61Currency';
import { Phonetic } from '@/pages/tools/Phonetic';
import { PivotalAltitude } from '@/pages/tools/PivotalAltitude';
import { PressureAltitude } from '@/pages/tools/PressureAltitude';
import { ProceduralSeparation } from '@/pages/tools/ProceduralSeparation';
import { SpecificRange } from '@/pages/tools/SpecificRange';
import { StandardRateTurn } from '@/pages/tools/StandardRateTurn';
import { SunTimes } from '@/pages/tools/SunTimes';
import { Taf } from '@/pages/tools/Taf';
import { TakeoffLanding } from '@/pages/tools/TakeoffLanding';
import { Tas } from '@/pages/tools/Tas';
import { TopOfClimb } from '@/pages/tools/TopOfClimb';
import { TopOfDescent } from '@/pages/tools/TopOfDescent';
import { Transponder } from '@/pages/tools/Transponder';
import { TrueAltitude } from '@/pages/tools/TrueAltitude';
import { Tsd } from '@/pages/tools/Tsd';
import { TurnPerformance } from '@/pages/tools/TurnPerformance';
import { Units } from '@/pages/tools/Units';
import { VfrBrief } from '@/pages/tools/VfrBrief';
import { WeightBalance } from '@/pages/tools/WeightBalance';
import { WindTable } from '@/pages/tools/WindTable';
import { WindTriangle } from '@/pages/tools/WindTriangle';
import { ZuluClock } from '@/pages/tools/ZuluClock';

const PAGES: Record<string, ComponentType> = {
  AiracCycle,
  Altimeter,
  ChartSymbols,
  ClimbGradient,
  CloudBase,
  CriticalPoint,
  Crosswind,
  DensityAltitude,
  DescentVdp,
  E6b,
  FlightPlan,
  FlightReview,
  Fuel,
  GreatCircle,
  Holding,
  Hydroplaning,
  Isa,
  Loa,
  Mach,
  MedicalValidity,
  Metar,
  Notam,
  OneInSixty,
  Part61Currency,
  Phonetic,
  PivotalAltitude,
  PressureAltitude,
  ProceduralSeparation,
  SpecificRange,
  StandardRateTurn,
  SunTimes,
  Taf,
  TakeoffLanding,
  Tas,
  TopOfClimb,
  TopOfDescent,
  Transponder,
  TrueAltitude,
  Tsd,
  TurnPerformance,
  Units,
  VfrBrief,
  WeightBalance,
  WindTable,
  WindTriangle,
  ZuluClock,
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('tool pages mount cleanly with the CalcShell frame', () => {
  for (const [name, Component] of Object.entries(PAGES)) {
    it(`${name} renders a titled CalcShell page`, () => {
      renderWithRouter(<Component />);
      // CalcShell always renders the page title as the single <h1>; its presence
      // proves the page → CalcShell wiring mounted without throwing.
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
      expect(h1.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  }
});
