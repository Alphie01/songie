import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installAudioUnlock } from '@songie/game-kit/audio';
import { App } from './App';

// Sesi ilk dokunuşta aç: oyun başladığında ilk klip kendiliğinden çalabilsin.
installAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
