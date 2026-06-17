import { describe, it, expect } from 'vitest';
import { startSttStream } from './stt';

describe('startSttStream', () => {
  it('throws a clear error when called without an API key', () => {
    // An empty key would otherwise build an invalid WebSocket (empty subprotocol),
    // throwing a cryptic SyntaxError that aborts the caller. Fail loudly instead.
    expect(() => startSttStream('', () => {})).toThrow(/api key/i);
  });
});
