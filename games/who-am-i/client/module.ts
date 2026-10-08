import './who-am-i.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { WhoAmISettings, WhoAmIView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<WhoAmISettings, WhoAmIView> = { SettingsPanel, PlayView };
export default mod;
