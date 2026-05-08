const sessionKey = "agents-internet-session-id";

export function getSessionId() {
  const existing = localStorage.getItem(sessionKey);
  if (existing) return existing;

  const next = createSessionId();
  setSessionId(next);
  return next;
}

export function createSessionId() {
  return crypto.randomUUID();
}

export function setSessionId(sessionId: string) {
  localStorage.setItem(sessionKey, sessionId);
}
