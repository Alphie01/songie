import './intrigue.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { IntrigueSettings, IntrigueView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<IntrigueSettings, IntrigueView> = { SettingsPanel, PlayView };
export default mod;
