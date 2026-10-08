import './red-flag.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { RedFlagSettings, RedFlagView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<RedFlagSettings, RedFlagView> = { SettingsPanel, PlayView };
export default mod;
