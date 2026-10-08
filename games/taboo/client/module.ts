import './taboo.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { TabooSettings, TabooView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<TabooSettings, TabooView> = { SettingsPanel, PlayView };
export default mod;
