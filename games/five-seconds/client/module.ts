import './five-seconds.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { FiveSecondsSettings, FiveSecondsView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<FiveSecondsSettings, FiveSecondsView> = { SettingsPanel, PlayView };
export default mod;
