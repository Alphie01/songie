import './charades.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { CharadesSettings, CharadesView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<CharadesSettings, CharadesView> = { SettingsPanel, PlayView };
export default mod;
