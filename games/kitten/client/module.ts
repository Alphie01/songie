import './kitten.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { KittenSettings, KittenView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<KittenSettings, KittenView> = { SettingsPanel, PlayView };
export default mod;
