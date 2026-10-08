import './agents.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { AgentsSettings, AgentsView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<AgentsSettings, AgentsView> = { SettingsPanel, PlayView };
export default mod;
