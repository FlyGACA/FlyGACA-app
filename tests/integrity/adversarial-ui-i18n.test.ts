import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import {
  ALL_WIDGETS,
  dashboardOrder,
  orderedWidgets,
  quickActionsFor,
  visibleWidgets,
} from '@/calc/app/dashboardLayout';
import { summarizeLogbook, flightsToCsv, csvToFlights } from '@/calc/pilot/logbook';
import type { Flight } from '@/lib/services/account';

/** Helper to get nested value by dot path */
function getByPath(obj: Record<string, unknown>, pathStr: string): unknown {
  const parts = pathStr.split('.');
  let curr: unknown = obj;
  for (const p of parts) {
    if (curr && typeof curr === 'object' && p in (curr as Record<string, unknown>)) {
      curr = (curr as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return curr;
}

describe('Adversarial RTL & CSS Logical Properties Audit', () => {
  const srcDir = path.resolve(__dirname, '../../src');

  /** Find all .css files recursively */
  function findCssFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(findCssFiles(fullPath));
      } else if (file.endsWith('.css')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const cssFiles = findCssFiles(srcDir);

  it('verifies no CSS file uses forbidden physical margin/padding properties (requires logical properties)', () => {
    const forbiddenProps = [
      /margin-left\s*:/i,
      /margin-right\s*:/i,
      /padding-left\s*:/i,
      /padding-right\s*:/i,
      /text-align\s*:\s*(left|right)/i,
    ];

    const violations: { file: string; line: number; match: string }[] = [];

    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of forbiddenProps) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(srcDir, file),
              line: idx + 1,
              match: line.trim(),
            });
          }
        }
      });
    }

    expect(
      violations,
      `Found forbidden physical CSS properties that break RTL mirroring:\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.match}`)
        .join('\n')}`,
    ).toEqual([]);
  });
});

describe('Adversarial Persona Hierarchy & Layout State Stress Test', () => {
  const roles = ['student', 'instructor', 'dispatcher', 'pilot'] as const;

  it('every persona provides a complete, unique permutation of ALL_WIDGETS', () => {
    for (const role of roles) {
      const order = dashboardOrder(role);
      expect(order).toHaveLength(ALL_WIDGETS.length);
      expect(new Set(order).size).toBe(ALL_WIDGETS.length);
      expect([...order].sort()).toEqual([...ALL_WIDGETS].sort());
    }
  });

  it('guarantees specific persona lead widget requirements', () => {
    // Student leads with training/study
    expect(dashboardOrder('student')[0]).toBe('study');
    // Instructor leads with currency/safety records
    expect(dashboardOrder('instructor')[0]).toBe('currency');
    // Dispatcher leads with weather/flight planning tools
    expect(dashboardOrder('dispatcher')[0]).toBe('tools');
    // Pilot leads with flight hours & recency metrics
    expect(dashboardOrder('pilot')[0]).toBe('numbers');
  });

  it('stress tests rapid persona transitions and layout composition', () => {
    // Simulate user switching through multiple personas with custom widget arrangement
    const initialRole = 'student';
    let currentOrder = dashboardOrder(initialRole);

    // User customizes order: pin 'bookmarks' and 'offline' to top
    const userCustomPrefs = ['bookmarks', 'offline'];
    let composed = orderedWidgets(currentOrder, userCustomPrefs);
    expect(composed.slice(0, 2)).toEqual(['bookmarks', 'offline']);

    // User switches role to instructor
    const nextRole = 'instructor';
    currentOrder = dashboardOrder(nextRole);
    composed = orderedWidgets(currentOrder, userCustomPrefs);
    // Custom pinned widgets stay at top, rest follow instructor order
    expect(composed.slice(0, 2)).toEqual(['bookmarks', 'offline']);
    expect(composed.filter((w) => !userCustomPrefs.includes(w))[0]).toBe('currency');

    // User hides 'numbers' and 'trend'
    const hidden = ['numbers', 'trend'];
    const visible = visibleWidgets(composed, hidden);
    expect(visible).not.toContain('numbers');
    expect(visible).not.toContain('trend');
    expect(visible.length).toBe(ALL_WIDGETS.length - 2);

    // Corrupted saved state (unknown widgets, empty strings, null string)
    const corruptedSaved = ['unknown_widget', 'adel', '', 'null', 'study'];
    const sanitized = orderedWidgets(currentOrder, corruptedSaved);
    expect(sanitized).toHaveLength(ALL_WIDGETS.length);
    expect(new Set(sanitized).size).toBe(ALL_WIDGETS.length);
    expect(sanitized[0]).toBe('adel');
    expect(sanitized[1]).toBe('study');
  });

  it('verifies all quick action label keys resolve in both en.json and ar.json', () => {
    for (const role of [...roles, '', 'unknown_role']) {
      const actions = quickActionsFor(role);
      expect(actions.length).toBeGreaterThanOrEqual(2);

      for (const action of actions) {
        const enVal = getByPath(en as Record<string, unknown>, action.labelKey);
        const arVal = getByPath(ar as Record<string, unknown>, action.labelKey);

        expect(
          enVal,
          `Missing EN translation for quick action key ${action.labelKey}`,
        ).toBeDefined();
        expect(
          arVal,
          `Missing AR translation for quick action key ${action.labelKey}`,
        ).toBeDefined();
        expect(typeof enVal).toBe('string');
        expect(typeof arVal).toBe('string');
        expect((enVal as string).trim().length).toBeGreaterThan(0);
        expect((arVal as string).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('verifies all role names resolve in en.json and ar.json', () => {
    for (const role of roles) {
      const enRole = getByPath(en as Record<string, unknown>, `account.roles.${role}`);
      const arRole = getByPath(ar as Record<string, unknown>, `account.roles.${role}`);

      expect(enRole, `Missing EN role label for ${role}`).toBeDefined();
      expect(arRole, `Missing AR role label for ${role}`).toBeDefined();
    }
  });
});

describe('Adversarial GACA Part 61 Logbook & Print View Stress Test', () => {
  const sampleFlights: Flight[] = [
    {
      id: 'f1',
      date: '2026-08-10',
      type: 'C172',
      reg: 'HZ-ABC',
      from: 'OERK',
      to: 'OEAB',
      total: '2.5',
      pic: '2.5',
      night: '0.8',
      ifr: '1.2',
      ldg: '3',
      nightLdg: '1',
      appr: 'ILS RWY 33',
      remarks: 'Abha mountain cross-country approach',
    },
    {
      id: 'f2',
      date: '2026-08-01',
      type: 'PA28',
      reg: 'HZ-XYZ',
      from: 'OEJN',
      to: 'OEDF',
      total: '3.0',
      pic: '3.0',
      night: '1.5',
      ifr: '0.0',
      ldg: '2',
      nightLdg: '2',
      remarks: 'Jeddah to Dammam night cross-country',
    },
    {
      id: 'f3',
      date: '2026-03-01', // Outside 90 days from August 2026
      type: 'DA42',
      reg: 'HZ-GAC',
      from: 'OERK',
      to: 'OERK',
      total: '1.0',
      pic: '0.0',
      night: '0.0',
      ifr: '1.0',
      ldg: '1',
      nightLdg: '0',
      remarks: 'Dual instrument training',
    },
  ];

  const nowAug = new Date('2026-08-14T12:00:00Z');

  it('accurately computes GACA Part 61 lifetime and 90-day currency metrics', () => {
    const summary = summarizeLogbook(sampleFlights, nowAug);
    expect(summary.totalHours).toBeCloseTo(6.5);
    expect(summary.picHours).toBeCloseTo(5.5);
    expect(summary.nightHours).toBeCloseTo(2.3);
    expect(summary.ifrHours).toBeCloseTo(2.2);
    expect(summary.landings).toBe(6);
    expect(summary.flightCount).toBe(3);

    // 90-day window: flights f1 and f2 are within 90 days; f3 is outside
    expect(summary.last90.flightCount).toBe(2);
    expect(summary.last90.hours).toBeCloseTo(5.5);
    expect(summary.last90.landings).toBe(5);
    expect(summary.last90.nightLandings).toBe(3);

    // Day landings = total landings - night landings = 5 - 3 = 2 (less than 3, so day currency < 3)
    const dayLandingsLast90 = summary.last90.landings - summary.last90.nightLandings;
    expect(dayLandingsLast90).toBe(2);
    expect(dayLandingsLast90 >= 3).toBe(false);
    // Night landings = 3 (meets 3 landings requirement for night passenger carrying)
    expect(summary.last90.nightLandings >= 3).toBe(true);
  });

  it('validates RFC 4180 CSV export round-trip with special characters and Arabic remarks', () => {
    const bidiFlights: Flight[] = [
      {
        id: 'f_ar',
        date: '2026-08-14',
        type: 'C172',
        reg: 'HZ-KSA',
        from: 'OERK',
        to: 'OETF',
        total: '1.8',
        pic: '1.8',
        night: '0',
        ifr: '0',
        ldg: '2',
        nightLdg: '0',
        remarks: 'رحلة تدريبية إلى مطار الطائف الإقليمي "ملاحظات"',
      },
    ];

    const csv = flightsToCsv(bidiFlights);
    const parsed = csvToFlights(csv);

    expect(parsed.flights).toHaveLength(1);
    expect(parsed.flights[0].remarks).toBe('رحلة تدريبية إلى مطار الطائف الإقليمي "ملاحظات"');
    expect(parsed.flights[0].reg).toBe('HZ-KSA');
    expect(parsed.flights[0].total).toBe('1.8');
  });

  it('verifies all GACA Part 61 Logbook table headers and print keys exist in bilingual i18n', () => {
    const requiredLogbookKeys = [
      'account.logbook',
      'account.date',
      'account.type',
      'account.reg',
      'account.from',
      'account.to',
      'account.total',
      'account.pic',
      'account.ifr',
      'account.night',
      'account.ldg',
      'account.remarks',
      'account.totals',
      'account.addFlight',
      'account.importCsv',
      'account.exportCsv',
      'account.exportData',
      'account.totalHours',
      'account.last90',
      'account.recency',
      'account.recencyDesc',
    ];

    for (const key of requiredLogbookKeys) {
      const enVal = getByPath(en as Record<string, unknown>, key);
      const arVal = getByPath(ar as Record<string, unknown>, key);

      expect(enVal, `Missing EN translation for logbook key ${key}`).toBeDefined();
      expect(arVal, `Missing AR translation for logbook key ${key}`).toBeDefined();
    }
  });
});
