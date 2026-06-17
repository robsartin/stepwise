import { describe, it, expect } from 'vitest';
import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import { eventToCommand, eventToMenuCommand } from './events';

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

describe('eventToMenuCommand', () => {
  it('maps scroll up to up', () => {
    expect(eventToMenuCommand({ textEvent: { eventType: OsEventTypeList.SCROLL_TOP_EVENT } })).toBe(
      'up',
    );
  });

  it('maps scroll down to down', () => {
    expect(
      eventToMenuCommand({ textEvent: { eventType: OsEventTypeList.SCROLL_BOTTOM_EVENT } }),
    ).toBe('down');
  });

  it('maps a tap (sys click) to select', () => {
    expect(eventToMenuCommand({ sysEvent: { eventType: OsEventTypeList.CLICK_EVENT } })).toBe(
      'select',
    );
  });

  it('treats an undefined sys eventType as a click (select)', () => {
    expect(eventToMenuCommand({ sysEvent: {} })).toBe('select');
  });

  it('maps a double-tap to exit', () => {
    expect(
      eventToMenuCommand({ sysEvent: { eventType: OsEventTypeList.DOUBLE_CLICK_EVENT } }),
    ).toBe('exit');
  });

  it('returns null for an unrecognized event', () => {
    expect(eventToMenuCommand({})).toBeNull();
  });
});
