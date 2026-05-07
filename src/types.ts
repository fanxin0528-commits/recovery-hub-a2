export type AnyRecord = Record<string, string | number | null | undefined>;

export type ApiOptions = {
  bodyAreas: AnyRecord[];
  recoveryStages: AnyRecord[];
  activityGoals: AnyRecord[];
  tags: AnyRecord[];
};

export type HomePayload = {
  currentUser: { userId: number; displayName: string };
  context: AnyRecord;
  latestPainState?: AnyRecord;
  recommendedLogs: AnyRecord[];
  recommendedThreads: AnyRecord[];
  savedItems: AnyRecord[];
};

export type ContextPayload = {
  context: AnyRecord;
  options: ApiOptions;
};

export type StagePayload = {
  context: AnyRecord;
  stage: AnyRecord;
  logs: AnyRecord[];
  discussions: AnyRecord[];
  movementIdeas: string[];
};

export type ExplorePayload = {
  options: ApiOptions;
  similarPeople: AnyRecord[];
  logs: AnyRecord[];
  discussions: AnyRecord[];
  note: string;
};

export type DetailPayload = {
  type: 'log' | 'thread';
  item: AnyRecord;
  tags: AnyRecord[];
  replies: AnyRecord[];
};
