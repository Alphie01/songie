import './never.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { NeverSettings, NeverView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<NeverSettings, NeverView> = { SettingsPanel, PlayView };
export default mod;
