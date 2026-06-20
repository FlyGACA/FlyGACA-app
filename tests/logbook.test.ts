import { describe, expect, it } from 'vitest';
import { summarizeLogbook, flightsToCsv } from '../src/calc/logbook';
import type { Flight } from '../src/lib/account';

const now = new Date('2024-06-01T12:00:00Z');

const flight = (date: string, over: Partial<Flight> = {}): Flight => ({
  id: date,
  date,
  type: 'C172',
  reg: 'HZ-ABC',
  from: 'OERK',
  to: 'OEDF',
  total: '1.0',
  pic: '1.0',
  night: '0',
  ifr: '0',
  ldg: '1',
  remarks: '',
  ...over,
});

describe('summarizeLogbook', () => {
  const flights = [
    flight('2024-05-20', { total: '2.0', pic: '2.0', night: '1.0', ifr: '0.5', ldg: '2' }),
    flight('2024-04-10', { total: '1.5', pic: '1.0', ldg: '1' }),
    flight('2024-01-01', { total: '3.0', pic: '3.0', ldg: '4' }), // outside the 90-day window
  ];

  it('sums every flight for the lifetime totals', () => {
    const s = summarizeLogbook(flights, now);
    expect(s.totalHours).toBeCloseTo(6.5);
    expect(s.picHours).toBeCloseTo(6.0);
    expect(s.nightHours).toBeCloseTo(1.0);
    expect(s.landings).toBe(7);
    expect(s.flightCount).toBe(3);
  });

  it('windows the last-90-day rollup', () => {
    const s = summarizeLogbook(flights, now);
    expect(s.last90.flightCount).toBe(2);
    expect(s.last90.hours).toBeCloseTo(3.5);
    expect(s.last90.landings).toBe(3);
  });

  it('returns the newest-first slice for recent', () => {
    const s = summarizeLogbook(flights, now, 2);
    expect(s.recent.map((f) => f.date)).toEqual(['2024-05-20', '2024-04-10']);
  });
});

describe('flightsToCsv', () => {
  it('emits a header and one row per flight', () => {
    const csv = flightsToCsv([flight('2024-05-20', { type: 'PA28' })]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('date,type,reg,from,to,total,pic,night,ifr,ldg,nightLdg,appr,remarks');
    expect(lines[1].startsWith('2024-05-20,PA28,')).toBe(true);
    expect(lines).toHaveLength(2);
  });

  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const csv = flightsToCsv([flight('2024-05-20', { remarks: 'touch, go\nand "circuits"' })]);
    expect(csv).toContain('"touch, go\nand ""circuits"""');
  });

  it('renders missing optional columns as empty cells', () => {
    const f = flight('2024-05-20');
    delete f.nightLdg;
    delete f.appr;
    const row = flightsToCsv([f]).split('\r\n')[1];
    // ...,ldg,nightLdg,appr,remarks  → trailing empty cells for the two new optionals
    expect(row.endsWith('1,,,')).toBe(true);
  });
});
