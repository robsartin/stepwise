import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import type { Command, MenuCommand } from '../core/command';

interface EvenHubEventLike {
  sysEvent?: { eventType?: number };
  textEvent?: { eventType?: number };
}

// Protobuf omits zero-value fields, so a click (CLICK_EVENT === 0) arrives with
// sysEvent present but its eventType absent — coalesce it back to a click.
function sysEventType(event: EvenHubEventLike): number | null {
  return event.sysEvent ? (event.sysEvent.eventType ?? OsEventTypeList.CLICK_EVENT) : null;
}

export function eventToCommand(event: EvenHubEventLike): Command | null {
  const sysType = sysEventType(event);
  const textType = event.textEvent?.eventType ?? null;

  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT) return null;
  if (textType === OsEventTypeList.SCROLL_TOP_EVENT) return 'back';
  if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) return 'next';
  if (sysType === OsEventTypeList.CLICK_EVENT) return 'next';
  return null;
}

// The same raw events, read for the recipe picker: scroll moves the highlight,
// a click selects the highlighted recipe, a double-tap exits.
export function eventToMenuCommand(event: EvenHubEventLike): MenuCommand | null {
  const sysType = sysEventType(event);
  const textType = event.textEvent?.eventType ?? null;

  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT) return 'exit';
  if (textType === OsEventTypeList.SCROLL_TOP_EVENT) return 'up';
  if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) return 'down';
  if (sysType === OsEventTypeList.CLICK_EVENT) return 'select';
  return null;
}
