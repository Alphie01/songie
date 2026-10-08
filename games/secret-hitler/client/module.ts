import './secret-hitler.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { SecretHitlerSettings, SecretHitlerView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<SecretHitlerSettings, SecretHitlerView> = { SettingsPanel, PlayView };
export default mod;
