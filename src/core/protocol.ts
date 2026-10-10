// Worker protocol (Appendix C §C1). Phase 0 has ping/pong only; Phase 4 adds load/extract.

export type Req =
  | { kind: 'ping'; reqId: number };

export type Res =
  | { kind: 'pong'; reqId: number }
  | { kind: 'error'; reqId: number; imageId?: number; message: string };
