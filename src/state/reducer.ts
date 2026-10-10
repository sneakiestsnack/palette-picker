// Pure reducer (Appendix C §C3).
import type { Action } from './actions';
import type { AppState } from './appState';

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'imageLoadStarted':
      return { ...state, loading: true, error: null };
    case 'imageLoaded':
      return {
        ...state,
        image: action.info,
        loading: false,
        error: null,
        palette: { ...state.palette, extractionRequest: state.palette.extractionRequest + 1 },
      };
    case 'imageLoadFailed':
      return { ...state, loading: false, error: action.error };
  }
}
