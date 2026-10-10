import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Action } from './actions';
import { initialState, type AppState } from './appState';
import { reducer } from './reducer';
import { useEngine, type EngineBinding } from './useEngine';

interface AppContextValue extends EngineBinding {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const engine = useEngine(dispatch);
  const value = useMemo(() => ({ state, dispatch, ...engine }), [state, engine]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
