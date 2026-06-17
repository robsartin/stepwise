import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import type { Command } from '../core/command';

interface EvenHubEventLike {
  sysEvent?: { eventType?: number };
  textEvent?: { eventType?: number };
}

export function eventToCommand(event: EvenHubEventLike): Command | null {
  const sysType = event.sysEvent ? (event.sysEvent.eventType ?? OsEventTypeList.CLICK_EVENT) : null;
  const textType = event.textEvent?.eventType ?? null;

  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT) return null;
  if (textType === OsEventTypeList.SCROLL_TOP_EVENT) return 'back';
  if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) return 'next';
  if (sysType === OsEventTypeList.CLICK_EVENT) return 'next';
  return null;
}
