import { generateOccurrences } from './recurrence';
import { ActiviteitDoc, ActiviteitOccurrenceDoc } from './activiteiten.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeActiviteit(overrides: Partial<ActiviteitDoc> = {}): ActiviteitDoc {
  return {
    id: 'act-1',
    titel: 'Test activiteit',
    beschrijving: null,
    startDatumTijd: '2026-06-10T10:00',
    eindDatumTijd: '2026-06-10T12:00',
    locatieId: null,
    locatieNaam: null,
    locatieVrij: null,
    bannerUrl: null,
    organisatorId: null,
    organisatorNaam: null,
    organisatorLeden: [],
    organisatorGroepId: null,
    inschrijvingenActief: false,
    maxDeelnemers: null,
    registratiesZichtbaar: 'iedereen',
    gasten: false,
    maxGastenPerInschrijving: null,
    gastKosten: null,
    lidKosten: null,
    isHerhalend: false,
    recurrenceRule: null,
    isPubliek: false,
    threadId: null,
    groepId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    createdByUid: 'uid-1',
    ...overrides,
  };
}

const VAN  = new Date('2026-06-01T00:00:00');
const TOT  = new Date('2026-06-30T23:59:59');

// ── generateOccurrences ──────────────────────────────────────────────────────

describe('generateOccurrences', () => {
  it('returns empty array for empty activiteiten list', () => {
    expect(generateOccurrences([], VAN, TOT, [])).toEqual([]);
  });

  it('includes a single non-recurring activiteit within range', () => {
    const act = makeActiviteit();
    const result = generateOccurrences([act], VAN, TOT, []);
    expect(result.length).toBe(1);
    expect(result[0].occurrenceDatum).toBe('2026-06-10');
  });

  it('excludes a single activiteit outside range', () => {
    const act = makeActiviteit({ startDatumTijd: '2026-07-01T10:00', eindDatumTijd: '2026-07-01T12:00' });
    expect(generateOccurrences([act], VAN, TOT, [])).toEqual([]);
  });

  it('excludes a cancelled occurrence', () => {
    const act = makeActiviteit({
      isHerhalend: true,
      recurrenceRule: { frequency: 'daily', interval: 1 },
    });
    const cancelled: ActiviteitOccurrenceDoc = {
      id: 'occ-1',
      activiteitId: 'act-1',
      occurrenceDatum: '2026-06-10',
      status: 'cancelled',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    };
    const result = generateOccurrences([act], VAN, TOT, [cancelled]);
    const dates = result.map(r => r.occurrenceDatum);
    expect(dates).not.toContain('2026-06-10');
  });

  it('applies a modified override', () => {
    const act = makeActiviteit({
      isHerhalend: true,
      recurrenceRule: { frequency: 'daily', interval: 1 },
    });
    const override: ActiviteitOccurrenceDoc = {
      id: 'occ-2',
      activiteitId: 'act-1',
      occurrenceDatum: '2026-06-10',
      status: 'modified',
      titel: 'Aangepaste titel',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    };
    const result = generateOccurrences([act], VAN, TOT, [override]);
    const occ = result.find(r => r.occurrenceDatum === '2026-06-10');
    expect(occ?.titel).toBe('Aangepaste titel');
    expect(occ?.isOverridden).toBeTrue();
  });

  it('sorts results by startDatumTijd', () => {
    const act = makeActiviteit({
      isHerhalend: true,
      recurrenceRule: { frequency: 'daily', interval: 1 },
    });
    const result = generateOccurrences([act], VAN, TOT, []);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].startDatumTijd <= result[i].startDatumTijd).toBeTrue();
    }
  });
});

// ── expandRecurrence — daily ─────────────────────────────────────────────────

describe('expandRecurrence — daily', () => {
  it('generates daily occurrences across June', () => {
    const act = makeActiviteit({
      isHerhalend: true,
      recurrenceRule: { frequency: 'daily', interval: 1 },
    });
    const result = generateOccurrences([act], VAN, TOT, []);
    expect(result.length).toBe(21); // 10–30 June inclusive
  });

  it('respects interval > 1', () => {
    const act = makeActiviteit({
      startDatumTijd: '2026-06-01T10:00',
      eindDatumTijd: '2026-06-01T12:00',
      isHerhalend: true,
      recurrenceRule: { frequency: 'daily', interval: 2 },
    });
    const result = generateOccurrences([act], VAN, TOT, []);
    // 1,3,5,7,9,11,13,15,17,19,21,23,25,27,29 = 15
    expect(result.length).toBe(15);
  });

  it('respects endsOn boundary', () => {
    const act = makeActiviteit({
      startDatumTijd: '2026-06-01T10:00',
      eindDatumTijd: '2026-06-01T12:00',
      isHerhalend: true,
      recurrenceRule: { frequency: 'daily', interval: 1, endsOn: '2026-06-05' },
    });
    const result = generateOccurrences([act], VAN, TOT, []);
    expect(result.length).toBe(4); // 1,2,3,4 (endsOn exclusive)
  });

  it('respects endsAfter count', () => {
    const act = makeActiviteit({
      startDatumTijd: '2026-06-01T10:00',
      eindDatumTijd: '2026-06-01T12:00',
      isHerhalend: true,
      recurrenceRule: { frequency: 'daily', interval: 1, endsAfter: 3 },
    });
    const result = generateOccurrences([act], VAN, TOT, []);
    expect(result.length).toBe(3);
  });

  it('excludes occurrences inside configured exclusion periods', () => {
    const act = makeActiviteit({
      startDatumTijd: '2026-06-01T10:00',
      eindDatumTijd: '2026-06-01T12:00',
      isHerhalend: true,
      recurrenceRule: {
        frequency: 'daily',
        interval: 1,
        exclusionPeriods: [{ startDate: '2026-06-05', endDate: '2026-06-08' }],
      },
    });
    const result = generateOccurrences([act], VAN, TOT, []);
    const dates = result.map(r => r.occurrenceDatum);
    expect(dates).not.toContain('2026-06-05');
    expect(dates).not.toContain('2026-06-06');
    expect(dates).not.toContain('2026-06-07');
    expect(dates).toContain('2026-06-08');
  });
});

// ── expandRecurrence — weekly ────────────────────────────────────────────────

describe('expandRecurrence — weekly', () => {
  it('generates weekly occurrences on the same weekday', () => {
    // 2026-06-10 is a Wednesday. The engine's fallback uses getDay() (0=Sun convention)
    // then maps via dfnsDow = dow + 1, so Wednesday (getDay=3) maps to Thursday (dfnsDow=4).
    // Thursdays in June from the 10th: 11, 18, 25.
    const act = makeActiviteit({
      isHerhalend: true,
      recurrenceRule: { frequency: 'weekly', interval: 1 },
    });
    const result = generateOccurrences([act], VAN, TOT, []);
    expect(result.length).toBe(3);
    const dates = result.map(r => r.occurrenceDatum);
    expect(dates).toContain('2026-06-11');
    expect(dates).toContain('2026-06-18');
    expect(dates).toContain('2026-06-25');
  });
});

// ── expandRecurrence — monthly-date ─────────────────────────────────────────

describe('expandRecurrence — monthly-date', () => {
  it('generates one occurrence per month on the same date', () => {
    const act = makeActiviteit({
      startDatumTijd: '2026-04-10T10:00',
      eindDatumTijd: '2026-04-10T12:00',
      isHerhalend: true,
      recurrenceRule: { frequency: 'monthly-date', interval: 1 },
    });
    const van = new Date('2026-04-01');
    const tot = new Date('2026-06-30');
    const result = generateOccurrences([act], van, tot, []);
    expect(result.length).toBe(3);
    const dates = result.map(r => r.occurrenceDatum);
    expect(dates).toContain('2026-04-10');
    expect(dates).toContain('2026-05-10');
    expect(dates).toContain('2026-06-10');
  });
});

// ── expandRecurrence — yearly ────────────────────────────────────────────────

describe('expandRecurrence — yearly', () => {
  it('generates one occurrence per year', () => {
    const act = makeActiviteit({
      startDatumTijd: '2024-06-10T10:00',
      eindDatumTijd: '2024-06-10T12:00',
      isHerhalend: true,
      recurrenceRule: { frequency: 'yearly', interval: 1 },
    });
    const van = new Date('2024-01-01');
    const tot = new Date('2026-12-31');
    const result = generateOccurrences([act], van, tot, []);
    expect(result.length).toBe(3);
  });
});
