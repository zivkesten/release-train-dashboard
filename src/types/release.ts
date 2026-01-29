export type StopStatus = 'not-started' | 'in-progress' | 'done' | 'blocked';
export type OwnerType = 'person' | 'automation';
export type Platform = 'ios' | 'android' | 'both';

export interface Note {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Stop {
  id: string;
  number: number;
  title: string;
  description: string;
  ownerType: OwnerType;
  ownerName: string;
  status: StopStatus;
  startedAt: string | null;
  completedAt: string | null;
  notes: Note[];
}

export interface ReleaseRun {
  id: string;
  version: string;
  platform: Platform;
  createdAt: string;
  updatedAt: string;
  stops: Stop[];
}

export interface StopConfig {
  title: string;
  description: string;
  ownerType: OwnerType;
  ownerName: string;
  icon: string;
}

export const STOP_CONFIGS: StopConfig[] = [
  {
    title: "Build dev for QA",
    description: "After feature/SDK integrations/internal testing",
    ownerType: "automation",
    ownerName: "Automation/Team",
    icon: "wrench",
  },
  {
    title: "QA approves",
    description: "Quality assurance sign-off",
    ownerType: "person",
    ownerName: "Diana",
    icon: "check-circle",
  },
  {
    title: "Pull changes from main to dev",
    description: "Sync development branch",
    ownerType: "automation",
    ownerName: "Script",
    icon: "git-branch",
  },
  {
    title: "Client cut",
    description: "Create release branch",
    ownerType: "automation",
    ownerName: "Script",
    icon: "scissors",
  },
  {
    title: "Build main release",
    description: "CI/CD pipeline build",
    ownerType: "automation",
    ownerName: "GitHub Action",
    icon: "rocket",
  },
  {
    title: "Sanity",
    description: "Final sanity check",
    ownerType: "person",
    ownerName: "Diana",
    icon: "heart-pulse",
  },
  {
    title: "Upload to store",
    description: "Deploy to App Store / Play Store",
    ownerType: "automation",
    ownerName: "Fastlane",
    icon: "store",
  },
  {
    title: "Release notes",
    description: "Write and publish release notes",
    ownerType: "person",
    ownerName: "Michal",
    icon: "file-text",
  },
  {
    title: "Rollout 10%",
    description: "Initial staged rollout",
    ownerType: "person",
    ownerName: "Ziv",
    icon: "percent",
  },
  {
    title: "Update rollout",
    description: "Expand rollout percentage",
    ownerType: "person",
    ownerName: "Maanit (Approver)",
    icon: "flag",
  },
];
