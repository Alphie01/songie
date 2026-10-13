import './documents.css';
import './detective.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { DetectiveSettings, DetectiveView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<DetectiveSettings, DetectiveView> = { SettingsPanel, PlayView };
export default mod;
