import { ReleaseRun, STOP_CONFIGS } from '@/types/release';

function createStops(progress: number, hasBlocked: boolean = false) {
  return STOP_CONFIGS.map((config, index) => {
    const stopNumber = index + 1;
    let status: 'not-started' | 'in-progress' | 'done' | 'blocked' = 'not-started';
    let startedAt = null;
    let completedAt = null;

    if (stopNumber < progress) {
      status = 'done';
      startedAt = new Date(Date.now() - (11 - stopNumber) * 86400000).toISOString();
      completedAt = new Date(Date.now() - (10 - stopNumber) * 86400000).toISOString();
    } else if (stopNumber === progress) {
      if (hasBlocked && stopNumber === 6) {
        status = 'blocked';
      } else {
        status = 'in-progress';
      }
      startedAt = new Date(Date.now() - 3600000).toISOString();
    }

    return {
      id: `stop-${stopNumber}`,
      number: stopNumber,
      title: config.title,
      description: config.description,
      ownerType: config.ownerType,
      ownerName: config.ownerName,
      status,
      startedAt,
      completedAt,
      notes: stopNumber <= progress ? [
        {
          id: `note-${stopNumber}-1`,
          author: config.ownerName.split(' ')[0],
          text: stopNumber === progress ? 'Working on this now...' : 'Completed successfully!',
          createdAt: new Date(Date.now() - (10 - stopNumber) * 86400000).toISOString(),
        }
      ] : [],
    };
  });
}

export const MOCK_CURRENT_RUN: ReleaseRun = {
  id: 'run-current',
  version: 'v3.2.0',
  platform: 'both',
  createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
  stops: createStops(6),
};

export const MOCK_PAST_RUNS: ReleaseRun[] = [
  {
    id: 'run-1',
    version: 'v3.1.2',
    platform: 'ios',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    stops: createStops(10),
  },
  {
    id: 'run-2',
    version: 'v3.1.1',
    platform: 'android',
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    stops: createStops(10),
  },
  {
    id: 'run-3',
    version: 'v3.1.0',
    platform: 'both',
    createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    stops: createStops(10),
  },
];

export function createNewRun(version: string, platform: 'ios' | 'android' | 'both'): ReleaseRun {
  return {
    id: `run-${Date.now()}`,
    version,
    platform,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stops: createStops(1),
  };
}
