import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Five focusable terminal blocks, in order:
 *   0. random   — a random game teaser (in the left column)
 *   1. services — the provider/library list
 *   2. games    — the game list (table)
 *   3. game     — the selected game card
 *   4. files    — the files inside the selected game's folder
 *
 * Blocks are switched with the number keys 0–4 or Tab / Shift+Tab. Each block
 * owns the arrow-key and shortcut-key handling for its own content.
 */
export type BlockId = 'random' | 'services' | 'games' | 'game' | 'files';

export const BLOCKS: BlockId[] = ['random', 'services', 'games', 'game', 'files'];

export const BLOCK_LABELS: Record<BlockId, string> = {
  random: 'random game',
  services: 'services',
  games: 'games',
  game: 'game',
  files: 'files',
};

type KeyHandler = (event: KeyboardEvent) => void;

type TerminalContextValue = {
  activeBlock: BlockId;
  focusBlock: (id: BlockId) => void;
  nextBlock: () => void;
  prevBlock: () => void;
  setBlockAvailable: (id: BlockId, available: boolean) => void;
  registerKeyHandler: (id: BlockId, handler: KeyHandler | null) => void;
};

const TerminalContext = createContext<TerminalContextValue | null>(null);

export function useTerminal(): TerminalContextValue {
  const value = useContext(TerminalContext);
  if (!value) throw new Error('useTerminal must be used inside <TerminalProvider>');
  return value;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function blurActiveElement() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [activeBlock, setActiveBlock] = useState<BlockId>('services');
  const [availability, setAvailability] = useState<Record<BlockId, boolean>>({
    random: true,
    services: true,
    games: true,
    game: false,
    files: false,
  });

  const activeRef = useRef(activeBlock);
  const availabilityRef = useRef(availability);
  const handlersRef = useRef<Partial<Record<BlockId, KeyHandler>>>({});

  activeRef.current = activeBlock;
  availabilityRef.current = availability;

  const focusBlock = useCallback((id: BlockId) => {
    if (availabilityRef.current[id]) setActiveBlock(id);
  }, []);

  const nextBlock = useCallback(() => {
    const start = BLOCKS.indexOf(activeRef.current);
    for (let step = 1; step <= BLOCKS.length; step++) {
      const id = BLOCKS[(start + step) % BLOCKS.length];
      if (availabilityRef.current[id]) {
        setActiveBlock(id);
        return;
      }
    }
  }, []);

  const prevBlock = useCallback(() => {
    const start = BLOCKS.indexOf(activeRef.current);
    for (let step = 1; step <= BLOCKS.length; step++) {
      const id = BLOCKS[(start - step + BLOCKS.length) % BLOCKS.length];
      if (availabilityRef.current[id]) {
        setActiveBlock(id);
        return;
      }
    }
  }, []);

  const setBlockAvailable = useCallback((id: BlockId, available: boolean) => {
    setAvailability((current) =>
      current[id] === available ? current : { ...current, [id]: available },
    );
  }, []);

  const registerKeyHandler = useCallback((id: BlockId, handler: KeyHandler | null) => {
    if (handler) handlersRef.current[id] = handler;
    else delete handlersRef.current[id];
  }, []);

  // If the active block stops being available (e.g. the selected game is
  // cleared), move focus to the next available block.
  useEffect(() => {
    if (availability[activeBlock]) return;
    const start = BLOCKS.indexOf(activeBlock);
    for (let step = 1; step <= BLOCKS.length; step++) {
      const id = BLOCKS[(start + step) % BLOCKS.length];
      if (availability[id]) {
        setActiveBlock(id);
        return;
      }
    }
  }, [availability, activeBlock]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // A Mantine modal (editor, settings, search, notes, delete) owns the
      // keyboard while it is open; never steal keys from a dialog.
      if (document.querySelector('[role="dialog"]')) return;

      const key = event.key;

      if (key === 'Tab') {
        event.preventDefault();
        blurActiveElement();
        if (event.shiftKey) prevBlock();
        else nextBlock();
        return;
      }

      if (key >= '0' && key <= '4') {
        event.preventDefault();
        blurActiveElement();
        focusBlock(BLOCKS[Number(key)]);
        return;
      }

      const handler = handlersRef.current[activeRef.current];
      if (handler) {
        blurActiveElement();
        handler(event);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusBlock, nextBlock, prevBlock]);

  const value = useMemo<TerminalContextValue>(
    () => ({
      activeBlock,
      focusBlock,
      nextBlock,
      prevBlock,
      setBlockAvailable,
      registerKeyHandler,
    }),
    [activeBlock, focusBlock, nextBlock, prevBlock, setBlockAvailable, registerKeyHandler],
  );

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
}

/**
 * Registers a block's keyboard handler for as long as that block is the active
 * one. The handler is re-registered every render while active, so it always
 * closes over fresh state.
 */
export function useBlockKeys(id: BlockId, handler: KeyHandler | null) {
  const { activeBlock, registerKeyHandler } = useTerminal();
  const active = activeBlock === id;
  useEffect(() => {
    if (!active || !handler) return;
    registerKeyHandler(id, handler);
    return () => registerKeyHandler(id, null);
  }, [active, handler, id, registerKeyHandler]);
}

/** Reports whether a block can currently receive focus (used by Tab / number keys). */
export function useBlockAvailability(id: BlockId, available: boolean) {
  const { setBlockAvailable } = useTerminal();
  useEffect(() => {
    setBlockAvailable(id, available);
  }, [id, available, setBlockAvailable]);
}
