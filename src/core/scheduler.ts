// LatestOnlyScheduler (A19): at most one request in flight; a newer request replaces the queued one;
// every in-flight response is delivered (they arrive in order), then the queued request is sent.
export class LatestOnlyScheduler<P> {
  private nextId = 1;
  private inFlight: number | null = null;
  private pending: { p: P } | null = null;

  constructor(private readonly send: (payload: P, reqId: number) => void) {}

  request(p: P): void {
    if (this.inFlight === null) this.dispatch(p);
    else this.pending = { p };
  }

  // true = deliver this response to the app
  onResponse(reqId: number): boolean {
    if (reqId !== this.inFlight) return false;
    this.inFlight = null;
    if (this.pending) {
      const { p } = this.pending;
      this.pending = null;
      this.dispatch(p);
    }
    return true;
  }

  reset(): void {
    this.inFlight = null;
    this.pending = null;
  }

  private dispatch(p: P): void {
    const id = this.nextId++;
    this.inFlight = id;
    this.send(p, id);
  }
}
