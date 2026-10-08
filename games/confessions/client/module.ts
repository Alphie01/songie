import './confessions.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { ConfessionsSettings, ConfessionsView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<ConfessionsSettings, ConfessionsView> = { SettingsPanel, PlayView };
export default mod;
