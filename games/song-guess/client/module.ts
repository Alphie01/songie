import './song.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { SongSettings, SongView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<SongSettings, SongView> = { SettingsPanel, PlayView };
export default mod;
