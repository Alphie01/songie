import './bottle.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { BottleSettings, BottleView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<BottleSettings, BottleView> = { SettingsPanel, PlayView };
export default mod;
