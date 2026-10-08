import './paranoia.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { ParanoiaSettings, ParanoiaView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<ParanoiaSettings, ParanoiaView> = { SettingsPanel, PlayView };
export default mod;
