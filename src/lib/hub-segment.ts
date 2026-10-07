export type HubSegment = "local" | "github";

const SEGMENT_KEY = "textume.hub.segment";
const SERVER_SNAPSHOT: HubSegment = "local";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: HubSegment | null = null;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeHubSegment(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHubSegment(): HubSegment {
  if (typeof window === "undefined") {
    return SERVER_SNAPSHOT;
  }

  if (cached) {
    return cached;
  }

  const stored = window.sessionStorage.getItem(SEGMENT_KEY);
  cached = stored === "github" ? "github" : "local";
  return cached;
}

export function getHubSegmentServerSnapshot(): HubSegment {
  return SERVER_SNAPSHOT;
}

export function setHubSegment(next: HubSegment): void {
  cached = next;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SEGMENT_KEY, next);
  }
  notify();
}
