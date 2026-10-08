import './frequency.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { FrequencySettings, FrequencyView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<FrequencySettings, FrequencyView> = { SettingsPanel, PlayView };
export default mod;
