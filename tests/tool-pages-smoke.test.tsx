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
import { AiracCycle } from '../src/pages/tools/AiracCycle';
import { Altimeter } from '../src/pages/tools/Altimeter';
import { ChartSymbols } from '../src/pages/tools/ChartSymbols';
import { ClimbGradient } from '../src/pages/tools/ClimbGradient';
import { CloudBase } from '../src/pages/tools/CloudBase';
import { CriticalPoint } from '../src/pages/tools/CriticalPoint';
import { Crosswind } from '../src/pages/tools/Crosswind';
import { DensityAltitude } from '../src/pages/tools/DensityAltitude';
import { DescentVdp } from '../src/pages/tools/DescentVdp';
import { E6b } from '../src/pages/tools/E6b';
import { FlightPlan } from '../src/pages/tools/FlightPlan';
import { FlightReview } from '../src/pages/tools/FlightReview';
import { Fuel } from '../src/pages/tools/Fuel';
import { GreatCircle } from '../src/pages/tools/GreatCircle';
import { Holding } from '../src/pages/tools/Holding';
import { Hydroplaning } from '../src/pages/tools/Hydroplaning';
import { Isa } from '../src/pages/tools/Isa';
import { Loa } from '../src/pages/tools/Loa';
import { Mach } from '../src/pages/tools/Mach';
import { MedicalValidity } from '../src/pages/tools/MedicalValidity';
import { Metar } from '../src/pages/tools/Metar';
import { Notam } from '../src/pages/tools/Notam';
import { OneInSixty } from '../src/pages/tools/OneInSixty';
import { Part61Currency } from '../src/pages/tools/Part61Currency';
import { Phonetic } from '../src/pages/tools/Phonetic';
import { PivotalAltitude } from '../src/pages/tools/PivotalAltitude';
import { PressureAltitude } from '../src/pages/tools/PressureAltitude';
import { ProceduralSeparation } from '../src/pages/tools/ProceduralSeparation';
import { SpecificRange } from '../src/pages/tools/SpecificRange';
import { StandardRateTurn } from '../src/pages/tools/StandardRateTurn';
import { SunTimes } from '../src/pages/tools/SunTimes';
import { Taf } from '../src/pages/tools/Taf';
import { TakeoffLanding } from '../src/pages/tools/TakeoffLanding';
import { Tas } from '../src/pages/tools/Tas';
import { TopOfClimb } from '../src/pages/tools/TopOfClimb';
import { TopOfDescent } from '../src/pages/tools/TopOfDescent';
import { Transponder } from '../src/pages/tools/Transponder';
import { TrueAltitude } from '../src/pages/tools/TrueAltitude';
import { Tsd } from '../src/pages/tools/Tsd';
import { TurnPerformance } from '../src/pages/tools/TurnPerformance';
import { Units } from '../src/pages/tools/Units';
import { VfrBrief } from '../src/pages/tools/VfrBrief';
import { WeightBalance } from '../src/pages/tools/WeightBalance';
import { WindTable } from '../src/pages/tools/WindTable';
import { WindTriangle } from '../src/pages/tools/WindTriangle';
import { ZuluClock } from '../src/pages/tools/ZuluClock';

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
