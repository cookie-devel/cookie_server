interface Session {
  socketID: string;
  connected: boolean;
}

/* abstract */
abstract class SessionStore<T extends Session> {
  sessions: Map<string, T> = new Map();

  abstract findSession(id: string): T | undefined;
  abstract saveSession(id: string, session: T): void;
  abstract findAllSessions(): T[];
}

class InMemorySessionStore<T extends Session> extends SessionStore<T> {
  constructor() {
    super();
  }

  findSession(id: string) {
    return this.sessions.get(id);
  }

  saveSession(id: string, session: T) {
    this.sessions.set(id, session);
  }

  findAllSessions() {
    return [...this.sessions.values()];
  }
}

export { Session, InMemorySessionStore };
