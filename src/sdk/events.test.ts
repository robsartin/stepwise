import { describe, it, expect } from 'vitest';
import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import { eventToCommand } from './events';

describe('eventToCommand', () => {
  it('maps a tap (sys click) to next', () => {
    expect(eventToCommand({ sysEvent: { eventType: OsEventTypeList.CLICK_EVENT } })).toBe('next');
  });

  it('maps scroll up to back', () => {
    expect(eventToCommand({ textEvent: { eventType: OsEventTypeList.SCROLL_TOP_EVENT } })).toBe(
      'back',
    );
  });

  it('maps scroll down to next', () => {
    expect(eventToCommand({ textEvent: { eventType: OsEventTypeList.SCROLL_BOTTOM_EVENT } })).toBe(
      'next',
    );
  });

  it('returns null for a double-tap (handled as exit elsewhere)', () => {
    expect(
      eventToCommand({ sysEvent: { eventType: OsEventTypeList.DOUBLE_CLICK_EVENT } }),
    ).toBeNull();
  });

  it('treats an undefined sys eventType as a click (next)', () => {
    expect(eventToCommand({ sysEvent: {} })).toBe('next');
  });
});
