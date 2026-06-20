import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './app/Layout';
import { Home } from './pages/Home/Home';

/**
 * Lazy a named export into a route component. Every page except Home is
 * code-split; the Layout's Suspense boundary renders the fallback while a
 * route chunk loads. Vite groups co-located pages into per-section chunks,
 * so the initial bundle carries only Home + the shared chrome.
 */
function lazyNamed<M, K extends keyof M>(loader: () => Promise<M>, key: K) {
  return lazy(() => loader().then((m) => ({ default: m[key] as ComponentType })));
}

// Library
const Library = lazyNamed(() => import('./pages/library/Library'), 'Library');
const Document = lazyNamed(() => import('./pages/library/Document'), 'Document') as ComponentType<{
  kind?: 'reference' | 'handbook';
}>;
const Charts = lazyNamed(() => import('./pages/library/Charts'), 'Charts');
const Chat = lazyNamed(() => import('./pages/chat/Chat'), 'Chat');

// Tools
const ToolsIndex = lazyNamed(() => import('./pages/tools/ToolsIndex'), 'ToolsIndex');
const Crosswind = lazyNamed(() => import('./pages/tools/Crosswind'), 'Crosswind');
const DensityAltitude = lazyNamed(() => import('./pages/tools/DensityAltitude'), 'DensityAltitude');
const Tas = lazyNamed(() => import('./pages/tools/Tas'), 'Tas');
const PressureAltitude = lazyNamed(
  () => import('./pages/tools/PressureAltitude'),
  'PressureAltitude',
);
const Isa = lazyNamed(() => import('./pages/tools/Isa'), 'Isa');
const Altimeter = lazyNamed(() => import('./pages/tools/Altimeter'), 'Altimeter');
const CloudBase = lazyNamed(() => import('./pages/tools/CloudBase'), 'CloudBase');
const Mach = lazyNamed(() => import('./pages/tools/Mach'), 'Mach');
const ClimbGradient = lazyNamed(() => import('./pages/tools/ClimbGradient'), 'ClimbGradient');
const StandardRateTurn = lazyNamed(
  () => import('./pages/tools/StandardRateTurn'),
  'StandardRateTurn',
);
const WindTable = lazyNamed(() => import('./pages/tools/WindTable'), 'WindTable');
const Hydroplaning = lazyNamed(() => import('./pages/tools/Hydroplaning'), 'Hydroplaning');
const TakeoffLanding = lazyNamed(() => import('./pages/tools/TakeoffLanding'), 'TakeoffLanding');
const WindTriangle = lazyNamed(() => import('./pages/tools/WindTriangle'), 'WindTriangle');
const GreatCircle = lazyNamed(() => import('./pages/tools/GreatCircle'), 'GreatCircle');
const OneInSixty = lazyNamed(() => import('./pages/tools/OneInSixty'), 'OneInSixty');
const Tsd = lazyNamed(() => import('./pages/tools/Tsd'), 'Tsd');
const E6b = lazyNamed(() => import('./pages/tools/E6b'), 'E6b');
const TopOfDescent = lazyNamed(() => import('./pages/tools/TopOfDescent'), 'TopOfDescent');
const DescentVdp = lazyNamed(() => import('./pages/tools/DescentVdp'), 'DescentVdp');
const Fuel = lazyNamed(() => import('./pages/tools/Fuel'), 'Fuel');
const SpecificRange = lazyNamed(() => import('./pages/tools/SpecificRange'), 'SpecificRange');
const WeightBalance = lazyNamed(() => import('./pages/tools/WeightBalance'), 'WeightBalance');
const ZuluClock = lazyNamed(() => import('./pages/tools/ZuluClock'), 'ZuluClock');
const AiracCycle = lazyNamed(() => import('./pages/tools/AiracCycle'), 'AiracCycle');
const SunTimes = lazyNamed(() => import('./pages/tools/SunTimes'), 'SunTimes');
const Part61Currency = lazyNamed(() => import('./pages/tools/Part61Currency'), 'Part61Currency');
const MedicalValidity = lazyNamed(() => import('./pages/tools/MedicalValidity'), 'MedicalValidity');
const FlightReview = lazyNamed(() => import('./pages/tools/FlightReview'), 'FlightReview');
const Holding = lazyNamed(() => import('./pages/tools/Holding'), 'Holding');
const ProceduralSeparation = lazyNamed(
  () => import('./pages/tools/ProceduralSeparation'),
  'ProceduralSeparation',
);
const VfrBrief = lazyNamed(() => import('./pages/tools/VfrBrief'), 'VfrBrief');
const Loa = lazyNamed(() => import('./pages/tools/Loa'), 'Loa');
const Units = lazyNamed(() => import('./pages/tools/Units'), 'Units');
const Transponder = lazyNamed(() => import('./pages/tools/Transponder'), 'Transponder');
const Phonetic = lazyNamed(() => import('./pages/tools/Phonetic'), 'Phonetic');
const Metar = lazyNamed(() => import('./pages/tools/Metar'), 'Metar');
const Taf = lazyNamed(() => import('./pages/tools/Taf'), 'Taf');
const Notam = lazyNamed(() => import('./pages/tools/Notam'), 'Notam');
const MetBrief = lazyNamed(() => import('./pages/tools/MetBrief'), 'MetBrief');
const ChartSymbols = lazyNamed(() => import('./pages/tools/ChartSymbols'), 'ChartSymbols');
const VfrMinima = lazyNamed(() => import('./pages/tools/RegLookup'), 'VfrMinima');
const Oxygen = lazyNamed(() => import('./pages/tools/RegLookup'), 'Oxygen');
const FuelReserves = lazyNamed(() => import('./pages/tools/RegLookup'), 'FuelReserves');
const ConversionChecker = lazyNamed(() => import('./pages/tools/RegLookup'), 'ConversionChecker');
const Aerodromes = lazyNamed(() => import('./pages/tools/Aerodromes'), 'Aerodromes');
const Airspace = lazyNamed(() => import('./pages/tools/Airspace'), 'Airspace');
const Definitions = lazyNamed(() => import('./pages/tools/Definitions'), 'Definitions');
const RoutePlanner = lazyNamed(() => import('./pages/tools/RoutePlanner'), 'RoutePlanner');
const FlightPlan = lazyNamed(() => import('./pages/tools/FlightPlan'), 'FlightPlan');

// Guides
const GuidesIndex = lazyNamed(() => import('./pages/guides/GuidesIndex'), 'GuidesIndex');
const Guide = lazyNamed(() => import('./pages/guides/Guide'), 'Guide');

// Study
const StudyHub = lazyNamed(() => import('./pages/study/StudyHub'), 'StudyHub');
const Quiz = lazyNamed(() => import('./pages/study/Quiz'), 'Quiz');
const Flashcards = lazyNamed(() => import('./pages/study/Flashcards'), 'Flashcards');
const GroundSchool = lazyNamed(() => import('./pages/study/GroundSchool'), 'GroundSchool');
const MockExam = lazyNamed(() => import('./pages/study/MockExam'), 'MockExam');
const Paths = lazyNamed(() => import('./pages/study/Paths'), 'Paths');
const Packs = lazyNamed(() => import('./pages/study/Packs'), 'Packs');
const StudySheets = lazyNamed(() => import('./pages/study/StudySheets'), 'StudySheets');

// Account
const Account = lazyNamed(() => import('./pages/account/Account'), 'Account');
const Dashboard = lazyNamed(() => import('./pages/account/Dashboard'), 'Dashboard');
const Currency = lazyNamed(() => import('./pages/account/Currency'), 'Currency');
const Logbook = lazyNamed(() => import('./pages/account/Logbook'), 'Logbook');
const Settings = lazyNamed(() => import('./pages/account/Settings'), 'Settings');

// Marketing / legal
const Pricing = lazyNamed(() => import('./pages/Pricing'), 'Pricing');
const Schools = lazyNamed(() => import('./pages/Schools'), 'Schools');
const About = lazyNamed(() => import('./pages/About'), 'About');
const DisclaimerPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'DisclaimerPage');
const TermsPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'TermsPage');
const PrivacyPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'PrivacyPage');
const NotFound = lazyNamed(() => import('./pages/NotFound'), 'NotFound');

/**
 * Route table for the app. Each page lives under src/pages/. As more pages are
 * ported from the legacy site they slot in here (see MIGRATION.md).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'library', element: <Library /> },
      { path: 'library/charts', element: <Charts /> },
      { path: 'library/reference/:slug', element: <Document kind="reference" /> },
      { path: 'library/handbook/:slug', element: <Document kind="handbook" /> },
      { path: 'library/:slug', element: <Document /> },
      { path: 'chat', element: <Chat /> },
      { path: 'tools', element: <ToolsIndex /> },
      { path: 'tools/crosswind', element: <Crosswind /> },
      { path: 'tools/density-altitude', element: <DensityAltitude /> },
      { path: 'tools/tas', element: <Tas /> },
      { path: 'tools/pressure-altitude', element: <PressureAltitude /> },
      { path: 'tools/isa', element: <Isa /> },
      { path: 'tools/altimeter', element: <Altimeter /> },
      { path: 'tools/cloud-base', element: <CloudBase /> },
      { path: 'tools/mach', element: <Mach /> },
      { path: 'tools/climb-gradient', element: <ClimbGradient /> },
      { path: 'tools/standard-rate-turn', element: <StandardRateTurn /> },
      { path: 'tools/wind-table', element: <WindTable /> },
      { path: 'tools/hydroplaning', element: <Hydroplaning /> },
      { path: 'tools/takeoff-landing', element: <TakeoffLanding /> },
      { path: 'tools/wind-triangle', element: <WindTriangle /> },
      { path: 'tools/great-circle', element: <GreatCircle /> },
      { path: 'tools/one-in-sixty', element: <OneInSixty /> },
      { path: 'tools/tsd', element: <Tsd /> },
      { path: 'tools/e6b', element: <E6b /> },
      { path: 'tools/top-of-descent', element: <TopOfDescent /> },
      { path: 'tools/descent-vdp', element: <DescentVdp /> },
      { path: 'tools/fuel', element: <Fuel /> },
      { path: 'tools/specific-range', element: <SpecificRange /> },
      { path: 'tools/weight-balance', element: <WeightBalance /> },
      { path: 'tools/zulu-clock', element: <ZuluClock /> },
      { path: 'tools/airac', element: <AiracCycle /> },
      { path: 'tools/sun-times', element: <SunTimes /> },
      { path: 'tools/part61-currency', element: <Part61Currency /> },
      { path: 'tools/medical-validity', element: <MedicalValidity /> },
      { path: 'tools/flight-review', element: <FlightReview /> },
      { path: 'tools/holding', element: <Holding /> },
      { path: 'tools/procedural-separation', element: <ProceduralSeparation /> },
      { path: 'tools/vfr-brief', element: <VfrBrief /> },
      { path: 'tools/loa', element: <Loa /> },
      { path: 'tools/units', element: <Units /> },
      { path: 'tools/transponder', element: <Transponder /> },
      { path: 'tools/phonetic', element: <Phonetic /> },
      { path: 'tools/metar', element: <Metar /> },
      { path: 'tools/taf', element: <Taf /> },
      { path: 'tools/notam', element: <Notam /> },
      { path: 'tools/met-brief', element: <MetBrief /> },
      { path: 'tools/chart-symbols', element: <ChartSymbols /> },
      { path: 'tools/vfr-minima', element: <VfrMinima /> },
      { path: 'tools/oxygen', element: <Oxygen /> },
      { path: 'tools/fuel-reserves', element: <FuelReserves /> },
      { path: 'tools/conversion-checker', element: <ConversionChecker /> },
      { path: 'tools/aerodromes', element: <Aerodromes /> },
      { path: 'tools/airspace', element: <Airspace /> },
      { path: 'tools/definitions', element: <Definitions /> },
      { path: 'tools/route-planner', element: <RoutePlanner /> },
      { path: 'tools/flight-plan', element: <FlightPlan /> },
      { path: 'guides', element: <GuidesIndex /> },
      { path: 'guides/:slug', element: <Guide /> },
      { path: 'study', element: <StudyHub /> },
      { path: 'study/quiz', element: <Quiz /> },
      { path: 'study/flashcards', element: <Flashcards /> },
      { path: 'study/groundschool', element: <GroundSchool /> },
      { path: 'study/exam', element: <MockExam /> },
      { path: 'study/paths', element: <Paths /> },
      { path: 'study/packs', element: <Packs /> },
      { path: 'study/sheets', element: <StudySheets /> },
      { path: 'account', element: <Account /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'currency', element: <Currency /> },
      { path: 'logbook', element: <Logbook /> },
      { path: 'settings', element: <Settings /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'schools', element: <Schools /> },
      { path: 'about', element: <About /> },
      { path: 'disclaimer', element: <DisclaimerPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
