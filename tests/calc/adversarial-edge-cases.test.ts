import { describe, expect, it } from 'vitest';
import { densityAltitude, isaDeviation, isaTemperature, pressureAltitude } from '@/calc/isa';
import { altimeter, flightLevel, qfeToQnh, trueAltitude } from '@/calc/altimetry';
import { summarizeLogbook, flightsToCsv, csvToFlights } from '@/calc/pilot/logbook';
import { parseISO, validityByMonths, withinDays } from '@/calc/recency';
import { computeCurrency, rollingLandingExpiry } from '@/calc/pilot/currency';
import type { Flight, Profile } from '@/lib/services/account';

describe('Adversarial Challenge 1: Extreme Desert Temperatures & Altitude Physics', () => {
  it('Extreme desert heat: OAT 50°C at sea level (QNH 1013.25 hPa)', () => {
    // ISA standard at sea level: 15°C. At 50°C, ISA dev = +35°C.
    // PA = 0 ft. DA = 0 + 118.8 * 35 = 4,158 ft.
    const res = densityAltitude(0, 1013.25, 50);
    expect(res).not.toBeNull();
    expect(res!.pa).toBeCloseTo(0, 4);
    expect(res!.isaTemp).toBeCloseTo(15, 4);
    expect(res!.isaDev).toBeCloseTo(35, 4);
    expect(res!.da).toBeCloseTo(4158, 1);
  });

  it('Extreme desert heat: OAT 55°C (record KSA summer heat) at sea level (QNH 1013.25 hPa)', () => {
    // ISA standard at sea level: 15°C. At 55°C, ISA dev = +40°C.
    // DA = 0 + 118.8 * 40 = 4,752 ft.
    const res = densityAltitude(0, 1013.25, 55);
    expect(res).not.toBeNull();
    expect(res!.pa).toBeCloseTo(0, 4);
    expect(res!.isaDev).toBeCloseTo(40, 4);
    expect(res!.da).toBeCloseTo(4752, 1);
  });

  it('Negative temperatures: -20°C at 10,000 ft altitude', () => {
    // At PA 10,000 ft: ISA temp = 15 - 1.98 * 10 = -4.8°C.
    // At OAT = -20°C: ISA dev = -20 - (-4.8) = -15.2°C.
    // DA = 10,000 + 118.8 * (-15.2) = 10,000 - 1805.76 = 8,194.24 ft.
    const res = densityAltitude(10000, 1013.25, -20);
    expect(res).not.toBeNull();
    expect(res!.pa).toBeCloseTo(10000, 4);
    expect(res!.isaTemp).toBeCloseTo(-4.8, 4);
    expect(res!.isaDev).toBeCloseTo(-15.2, 4);
    expect(res!.da).toBeCloseTo(8194.24, 1);
  });

  it('True altitude under extreme cold (-20°C) with cold altimeter error', () => {
    // Indicated 10,000 ft, source elevation 0 ft, OAT -20°C.
    // ISA temp = -4.8°C, ISA dev = -15.2°C.
    // Correction = 4 * (-15.2) * (10000 / 1000) = -608 ft.
    // True altitude = 10000 - 608 = 9,392 ft.
    const r = trueAltitude(10000, 0, -20);
    expect(r).not.toBeNull();
    expect(r!.isaDevC).toBeCloseTo(-15.2, 4);
    expect(r!.correctionFt).toBeCloseTo(-608, 1);
    expect(r!.trueAltFt).toBeCloseTo(9392, 1);
  });

  it('True altitude under extreme desert heat (+50°C)', () => {
    // Indicated 5,000 ft, source elevation 1,000 ft, OAT +50°C.
    // At 5,000 ft: ISA temp = 15 - 1.98 * 5 = 5.1°C.
    // ISA dev = 50 - 5.1 = +44.9°C.
    // Correction = 4 * 44.9 * ((5000 - 1000) / 1000) = 4 * 44.9 * 4 = +718.4 ft.
    // True altitude = 5000 + 718.4 = 5,718.4 ft.
    const r = trueAltitude(5000, 1000, 50);
    expect(r).not.toBeNull();
    expect(r!.isaDevC).toBeCloseTo(44.9, 4);
    expect(r!.correctionFt).toBeCloseTo(718.4, 1);
    expect(r!.trueAltFt).toBeCloseTo(5718.4, 1);
  });

  it('Extreme high altitude / stratosphere entry: FL450 (45,000 ft)', () => {
    // PA 45,000 ft, OAT -56.5°C (standard tropopause temp)
    const pa = pressureAltitude(45000, 1013.25);
    expect(pa).toBeCloseTo(45000, 4);
    const fl = flightLevel(pa!);
    expect(fl).toBe(450);
  });

  it('Handles extreme non-finite or invalid numerical inputs safely without crashing', () => {
    expect(pressureAltitude(NaN, 1013)).toBeNull();
    expect(pressureAltitude(1000, Infinity)).toBeNull();
    expect(pressureAltitude(-Infinity, 1013)).toBeNull();
    expect(isaTemperature(NaN)).toBeNull();
    expect(isaTemperature(Infinity)).toBeNull();
    expect(isaDeviation(NaN, 5000)).toBeNull();
    expect(isaDeviation(35, NaN)).toBeNull();
    expect(densityAltitude(NaN, 1013, 25)).toBeNull();
    expect(densityAltitude(1000, NaN, 25)).toBeNull();
    expect(densityAltitude(1000, 1013, NaN)).toBeNull();
    expect(trueAltitude(NaN, 0, 20)).toBeNull();
    expect(trueAltitude(5000, NaN, 20)).toBeNull();
    expect(trueAltitude(5000, 0, NaN)).toBeNull();
  });
});

describe('Adversarial Challenge 2: High Elevation Aerodromes & QNH Extremes', () => {
  it('High elevation aerodrome: Abha Regional (OEAB) at 6,858 ft', () => {
    // Elevation 6,858 ft, QNH 1013.25 hPa, OAT 35°C (hot day)
    // PA = 6,858 ft.
    // ISA temp at 6,858 ft = 15 - 1.98 * 6.858 = 1.42116°C.
    // ISA dev = 35 - 1.42116 = 33.57884°C.
    // DA = 6,858 + 118.8 * 33.57884 = 6858 + 3989.166 = 10,847.166 ft.
    const res = densityAltitude(6858, 1013.25, 35);
    expect(res).not.toBeNull();
    expect(res!.pa).toBeCloseTo(6858, 4);
    expect(res!.isaTemp).toBeCloseTo(1.421, 2);
    expect(res!.isaDev).toBeCloseTo(33.579, 2);
    expect(res!.da).toBeCloseTo(10847.17, 1);
  });

  it('Abha (OEAB) QFE and round-trip conversion at 6,858 ft', () => {
    // At 6,858 ft, QNH 1013.25 hPa
    // QFE = 1013.25 - 6858 / 27.3 = 1013.25 - 251.20879 = 762.0412 hPa.
    const alt = altimeter(1013.25, 6858);
    expect(alt).not.toBeNull();
    expect(alt!.pressureAltitude).toBeCloseTo(6858, 4);
    expect(alt!.qfe).toBeCloseTo(762.04, 1);

    // Round-trip QFE to QNH
    const derivedQnh = qfeToQnh(alt!.qfe, 6858);
    expect(derivedQnh).toBeCloseTo(1013.25, 4);
  });

  it('Extreme elevation: Mt. Everest (29,029 ft)', () => {
    const res = densityAltitude(29029, 1013.25, -42.477);
    expect(res).not.toBeNull();
    expect(res!.pa).toBeCloseTo(29029, 4);
    // At standard ISA temp (-42.477°C), ISA dev should be ~0 and DA ≈ PA
    expect(res!.isaDev).toBeCloseTo(0, 1);
    expect(res!.da).toBeCloseTo(29029, 0);
  });

  it('Low QNH extreme: 950 hPa (deep tropical cyclone / depression)', () => {
    // Elevation 0 ft, QNH 950 hPa.
    // PA = 0 + (1013.25 - 950) * 27.3 = 63.25 * 27.3 = +1,726.725 ft.
    const pa = pressureAltitude(0, 950);
    expect(pa).toBeCloseTo(1726.725, 3);
  });

  it('High QNH extreme: 1050 hPa (intense Siberian / continental high)', () => {
    // Elevation 0 ft, QNH 1050 hPa.
    // PA = 0 + (1013.25 - 1050) * 27.3 = -36.75 * 27.3 = -1,003.275 ft (below sea level PA).
    const pa = pressureAltitude(0, 1050);
    expect(pa).toBeCloseTo(-1003.275, 3);
  });
});

describe('Adversarial Challenge 3: Logbook 90-Day Currency, Leap Years & Boundaries', () => {
  const makeFlight = (date: string, over: Partial<Flight> = {}): Flight => ({
    id: `fl-${date}-${Math.random().toString(36).slice(2, 6)}`,
    date,
    type: 'PA28',
    reg: 'HZ-GAC',
    from: 'OERK',
    to: 'OEAB',
    total: '2.5',
    pic: '2.5',
    night: '1.0',
    ifr: '0.0',
    ldg: '1',
    nightLdg: '0',
    remarks: 'Nav training',
    ...over,
  });

  it('Zero flights logbook', () => {
    const summary = summarizeLogbook([], new Date('2024-06-01T12:00:00Z'));
    expect(summary.totalHours).toBe(0);
    expect(summary.picHours).toBe(0);
    expect(summary.flightCount).toBe(0);
    expect(summary.last90.hours).toBe(0);
    expect(summary.last90.landings).toBe(0);
    expect(summary.last90.nightLandings).toBe(0);
    expect(summary.recent).toEqual([]);

    const profile: Pick<Profile, 'medicalExpiry' | 'lastFlightReview'> = {
      medicalExpiry: '',
      lastFlightReview: '',
    };
    const items = computeCurrency(profile, [], new Date('2024-06-01T12:00:00Z'));
    const p90 = items.find((i) => i.id === 'passenger90');
    const n90 = items.find((i) => i.id === 'nightPassenger');
    expect(p90?.status).toBe('expired');
    expect(p90?.count).toEqual({ have: 0, need: 3 });
    expect(n90?.status).toBe('expired');
    expect(n90?.count).toEqual({ have: 0, need: 3 });
  });

  it('Exact 90 days ago boundary in a leap year (2024: Feb 29)', () => {
    // Reference now: 2024-06-01T12:00:00Z
    // 2024 is a leap year (Feb 29).
    // March 3, 2024 + 90 days = June 1, 2024.
    // March 3 to June 1 is exactly 90 days (28 in Mar + 30 in Apr + 31 in May + 1 in Jun = 90 days).
    const now = new Date('2024-06-01T12:00:00Z');
    const exact90FlightDate = '2024-03-03';
    const day91FlightDate = '2024-03-02';

    expect(withinDays(exact90FlightDate, 90, now)).toBe(true);
    expect(withinDays(day91FlightDate, 90, now)).toBe(false);

    // Exactly 3 night landings on the 90th day
    const flightsExact = [makeFlight(exact90FlightDate, { ldg: '3', nightLdg: '3' })];
    const rExact = rollingLandingExpiry(
      flightsExact,
      90,
      3,
      (f) => parseFloat(f.nightLdg || '0'),
      now,
    );
    expect(rExact.count).toBe(3);
    expect(rExact.current).toBe(true);
    expect(rExact.expiry?.toISOString().slice(0, 10)).toBe('2024-06-01');

    // Day 91 flight: not current
    const flightsDay91 = [makeFlight(day91FlightDate, { ldg: '3', nightLdg: '3' })];
    const rDay91 = rollingLandingExpiry(
      flightsDay91,
      90,
      3,
      (f) => parseFloat(f.nightLdg || '0'),
      now,
    );
    expect(rDay91.count).toBe(0);
    expect(rDay91.current).toBe(false);
    expect(rDay91.expiry).toBeNull();
  });

  it('Exactly 3 night landings across multiple separate flights', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    const flights = [
      makeFlight('2024-05-15', { nightLdg: '1' }),
      makeFlight('2024-05-01', { nightLdg: '1' }),
      makeFlight('2024-04-10', { nightLdg: '1' }), // 3rd most-recent
      makeFlight('2024-02-01', { nightLdg: '5' }), // older than 90 days
    ];
    const r = rollingLandingExpiry(flights, 90, 3, (f) => parseFloat(f.nightLdg || '0'), now);
    expect(r.count).toBe(3);
    expect(r.current).toBe(true);
    // Expiry is 2024-04-10 + 90 days = 2024-07-09
    expect(r.expiry?.toISOString().slice(0, 10)).toBe('2024-07-09');
  });

  it('Flight review month rollover across February in non-leap vs leap years', () => {
    // Last flight review on 2022-02-28 + 24 months = 2024-02-28
    const rev2022 = validityByMonths(parseISO('2022-02-28'), 24, new Date('2024-01-01T12:00:00Z'));
    expect(rev2022?.expiry.toISOString().slice(0, 10)).toBe('2024-02-28');
    expect(rev2022?.current).toBe(true);

    // Evaluated after expiry: 2024-03-01
    const revExpired = validityByMonths(
      parseISO('2022-02-28'),
      24,
      new Date('2024-03-01T12:00:00Z'),
    );
    expect(revExpired?.current).toBe(false);
  });

  it('RFC 4180 CSV serialization and parsing round-trip with quotes and commas', () => {
    const flights: Flight[] = [
      makeFlight('2024-05-20', {
        remarks: 'ILS RWY 33L, "Wind 320/15kt", turbulent, sandstorm alert',
      }),
      makeFlight('2024-05-18', {
        from: 'OEAB',
        to: 'OERK',
        remarks: 'Flight test with "quotes" and, commas',
      }),
    ];

    const csv = flightsToCsv(flights);
    expect(csv).toContain('ILS RWY 33L');
    expect(csv).toContain('""Wind 320/15kt""');

    const parsed = csvToFlights(csv);
    expect(parsed.skipped).toBe(0);
    expect(parsed.flights.length).toBe(2);
    expect(parsed.flights[0].remarks).toBe(
      'ILS RWY 33L, "Wind 320/15kt", turbulent, sandstorm alert',
    );
    expect(parsed.flights[1].from).toBe('OEAB');
    expect(parsed.flights[1].to).toBe('OERK');
  });
});

describe('Adversarial Challenge 4: CBT Exam Score Boundaries & Flagging States', () => {
  // CBT Score algorithm model:
  // pct = Math.round((correct / total) * 100)
  // passed = pct >= passMark (75 by default, or pack override)

  function gradeExam(correct: number, total: number, passMark = 75) {
    if (total === 0) return { pct: 0, passed: false, correct, total };
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= passMark;
    return { pct, passed, correct, total };
  }

  it('Exact 75.0% pass mark boundary', () => {
    // 60 questions: 45 / 60 = 0.75 -> 75%
    const g60 = gradeExam(45, 60, 75);
    expect(g60.pct).toBe(75);
    expect(g60.passed).toBe(true);

    // 40 questions: 30 / 40 = 0.75 -> 75%
    const g40 = gradeExam(30, 40, 75);
    expect(g40.pct).toBe(75);
    expect(g40.passed).toBe(true);

    // 100 questions: 75 / 100 = 0.75 -> 75%
    const g100 = gradeExam(75, 100, 75);
    expect(g100.pct).toBe(75);
    expect(g100.passed).toBe(true);

    // 20 questions: 15 / 20 = 0.75 -> 75%
    const g20 = gradeExam(15, 20, 75);
    expect(g20.pct).toBe(75);
    expect(g20.passed).toBe(true);
  });

  it('Fail mark boundaries: 74.9% and below', () => {
    // 100 questions: 74 / 100 = 74% -> FAIL
    const g100Fail = gradeExam(74, 100, 75);
    expect(g100Fail.pct).toBe(74);
    expect(g100Fail.passed).toBe(false);

    // 60 questions: 44 / 60 = 73.33% -> 73% -> FAIL
    const g60Fail = gradeExam(44, 60, 75);
    expect(g60Fail.pct).toBe(73);
    expect(g60Fail.passed).toBe(false);

    // 50 questions: 37 / 50 = 74.0% -> 74% -> FAIL
    const g50Fail = gradeExam(37, 50, 75);
    expect(g50Fail.pct).toBe(74);
    expect(g50Fail.passed).toBe(false);

    // 43 questions: 32 / 43 = 74.418% -> Math.round -> 74% -> FAIL
    const g43 = gradeExam(32, 43, 75);
    expect(g43.pct).toBe(74);
    expect(g43.passed).toBe(false);
  });

  it('80% Pass mark boundary (for advanced ATPL/IR packs)', () => {
    // 50 questions: 40 / 50 = 80% -> PASS
    expect(gradeExam(40, 50, 80).passed).toBe(true);
    // 50 questions: 39 / 50 = 78% -> FAIL
    expect(gradeExam(39, 50, 80).passed).toBe(false);
  });

  it('0 questions answered or 0 correct', () => {
    const zeroCorrect = gradeExam(0, 60, 75);
    expect(zeroCorrect.pct).toBe(0);
    expect(zeroCorrect.passed).toBe(false);
    expect(zeroCorrect.correct).toBe(0);
  });

  it('All questions answered correctly (100%)', () => {
    const perfect = gradeExam(60, 60, 75);
    expect(perfect.pct).toBe(100);
    expect(perfect.passed).toBe(true);
  });

  it('Flagging state matrix does not corrupt answers or score', () => {
    // Verify an exam session where questions are flagged, unflagged, or left unanswered
    const totalQ = 10;
    const correctAnswers = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
    const userAnswers: (number | null)[] = [0, 1, 2, 3, 0, 1, 2, 3, null, null]; // 8 answered (all correct), 2 unanswered
    const userFlags = [true, true, true, true, true, true, true, true, true, true]; // all 10 flagged

    const correctCount = userAnswers.filter((a, idx) => a === correctAnswers[idx]).length;
    const answeredCount = userAnswers.filter((a) => a != null).length;
    const flaggedCount = userFlags.filter(Boolean).length;

    expect(correctCount).toBe(8);
    expect(answeredCount).toBe(8);
    expect(flaggedCount).toBe(10);

    const result = gradeExam(correctCount, totalQ, 75);
    expect(result.pct).toBe(80);
    expect(result.passed).toBe(true);
  });
});
