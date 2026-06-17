import { describe, it, expect } from 'vitest';
import { MenuController } from './menu';
import type { MenuView } from './ports';

interface Entry {
  id: string;
  label: string;
}

const entries: Entry[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
];

function setup() {
  const views: MenuView[] = [];
  const menu = new MenuController(entries, (v) => views.push(v));
  menu.start();
  return { menu, views, last: () => views[views.length - 1] };
}

describe('MenuController', () => {
  it('emits all entry labels on start, with the first highlighted', () => {
    const { last } = setup();
    expect(last().items).toEqual([
      { label: 'Alpha', selected: true },
      { label: 'Bravo', selected: false },
      { label: 'Charlie', selected: false },
    ]);
  });

  it('moves the highlight down on "down"', () => {
    const { menu, last } = setup();
    menu.handle('down');
    expect(last().items.map((i) => i.selected)).toEqual([false, true, false]);
  });

  it('wraps from the last item back to the first on "down"', () => {
    const { menu, last } = setup();
    menu.handle('down');
    menu.handle('down');
    menu.handle('down');
    expect(last().items.map((i) => i.selected)).toEqual([true, false, false]);
  });

  it('wraps from the first item to the last on "up"', () => {
    const { menu, last } = setup();
    menu.handle('up');
    expect(last().items.map((i) => i.selected)).toEqual([false, false, true]);
  });

  it('selected() returns the highlighted entry', () => {
    const { menu } = setup();
    menu.handle('down');
    expect(menu.selected()).toEqual({ id: 'b', label: 'Bravo' });
  });

  it('ignores select and exit (no movement, no extra emit)', () => {
    const { menu, views } = setup();
    const before = views.length;
    menu.handle('select');
    menu.handle('exit');
    expect(views.length).toBe(before);
    expect(menu.selected().id).toBe('a');
  });
});
