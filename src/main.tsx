import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { checkLittleEndian } from './platform/device';
import { App } from './ui/App';
import './ui/theme.css';

checkLittleEndian();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
