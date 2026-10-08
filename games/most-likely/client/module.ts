import './most-likely.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { MostLikelySettings, MostLikelyView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<MostLikelySettings, MostLikelyView> = { SettingsPanel, PlayView };
export default mod;
