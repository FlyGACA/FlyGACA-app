import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './app/Layout';
import { Home } from './pages/Home/Home';
import { ToolsIndex } from './pages/tools/ToolsIndex';
import { Crosswind } from './pages/tools/Crosswind';
import { DensityAltitude } from './pages/tools/DensityAltitude';
import { Tas } from './pages/tools/Tas';
import { PressureAltitude } from './pages/tools/PressureAltitude';
import { Isa } from './pages/tools/Isa';
import { Altimeter } from './pages/tools/Altimeter';
import { CloudBase } from './pages/tools/CloudBase';
import { Mach } from './pages/tools/Mach';
import { ClimbGradient } from './pages/tools/ClimbGradient';
import { StandardRateTurn } from './pages/tools/StandardRateTurn';
import { WindTable } from './pages/tools/WindTable';
import { Hydroplaning } from './pages/tools/Hydroplaning';
import { TakeoffLanding } from './pages/tools/TakeoffLanding';
import { WindTriangle } from './pages/tools/WindTriangle';
import { GreatCircle } from './pages/tools/GreatCircle';
import { OneInSixty } from './pages/tools/OneInSixty';
import { Tsd } from './pages/tools/Tsd';
import { TopOfDescent } from './pages/tools/TopOfDescent';
import { DescentVdp } from './pages/tools/DescentVdp';
import { Fuel } from './pages/tools/Fuel';
import { SpecificRange } from './pages/tools/SpecificRange';
import { WeightBalance } from './pages/tools/WeightBalance';
import { ZuluClock } from './pages/tools/ZuluClock';
import { AiracCycle } from './pages/tools/AiracCycle';
import { SunTimes } from './pages/tools/SunTimes';
import { Part61Currency } from './pages/tools/Part61Currency';
import { MedicalValidity } from './pages/tools/MedicalValidity';
import { FlightReview } from './pages/tools/FlightReview';
import { Holding } from './pages/tools/Holding';
import { ProceduralSeparation } from './pages/tools/ProceduralSeparation';
import { VfrBrief } from './pages/tools/VfrBrief';
import { Loa } from './pages/tools/Loa';
import { Library } from './pages/library/Library';
import { Document } from './pages/library/Document';
import { Chat } from './pages/chat/Chat';
import { About } from './pages/About';
import { DisclaimerPage, TermsPage, PrivacyPage } from './pages/legal/LegalPage';
import { NotFound } from './pages/NotFound';

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
      { path: 'about', element: <About /> },
      { path: 'disclaimer', element: <DisclaimerPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
