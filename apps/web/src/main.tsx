import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import '@fontsource/poppins/800-italic.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
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
