import './color-cards.css';
import type { ClientGameModule } from '@songie/game-kit/client';
import type { ColorCardsSettings, ColorCardsView } from '../shared/index.js';
import { PlayView } from './PlayView';
import { SettingsPanel } from './SettingsPanel';

const mod: ClientGameModule<ColorCardsSettings, ColorCardsView> = { SettingsPanel, PlayView };
export default mod;
