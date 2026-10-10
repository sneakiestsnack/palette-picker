import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import type { Settings } from '../core';
import { loadSettings, saveSettings } from '../platform/settingsStore';
import type { Action } from './actions';
import { createInitialState, type AppState } from './appState';
import { reducer } from './reducer';
import { useEngine, type EngineBinding } from './useEngine';

interface AppContextValue extends EngineBinding {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const loaded = useRef<Settings | null>(null);
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    loaded.current = loadSettings();
    return createInitialState(loaded.current);
  });
  const engine = useEngine(state, dispatch);

  // Persist preferences. Fields not yet in state keep their loaded values.
  const { controls, overlay } = state;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    saveSettings({ ...loaded.current!, controls, overlay });
  }, [controls, overlay]);

  const value = useMemo(() => ({ state, dispatch, ...engine }), [state, engine]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
