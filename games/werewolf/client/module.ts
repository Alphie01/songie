import './werewolf.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { WerewolfSettings, WerewolfView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<WerewolfSettings, WerewolfView> = { SettingsPanel, PlayView };
export default mod;
