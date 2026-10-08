import type { PoolDef } from './catalog.js';

/** Başlangıç listeleri. ID'ler Deezer'da doğrulandı (Ekim 2026). */
export const SEED_POOLS: PoolDef[] = [
  // Türkçe
  { id: 'tr-top', name: 'Türkiye Top 100', category: 'turkce', playlist: '1116189071' },
  { id: 'tr-pop', name: 'Türkçe Pop hitleri', category: 'turkce', playlist: '1183026041' },
  { id: 'tr-rap', name: 'Türkçe Rap', category: 'turkce', playlist: '1090311401' },
  { id: 'tr-rock', name: 'Türkçe Rock', category: 'turkce', playlist: '1450482795' },
  { id: 'tr-alt', name: 'Alternatif sahne', category: 'turkce', playlist: '853090561' },
  { id: 'tr-90s', name: "90'lar Türkçe Pop", category: 'turkce', playlist: '10726924142' },
  { id: 'tr-slow', name: "90'lar Türkçe slow", category: 'turkce', playlist: '11575694704' },
  { id: 'tr-nostalji', name: "Nostalji Türkçe Pop (90'lar–2000'ler)", category: 'turkce', playlist: '13530684023' },
  { id: 'tr-2010s', name: "Türkçe Pop 2010'lar", category: 'turkce', playlist: '7789251762' },
  { id: 'tr-arabesk', name: 'Arabesk klasikleri', category: 'turkce', playlist: '11348524364' },
  { id: 'tr-turku', name: 'En güzel türküler', category: 'turkce', playlist: '872707323' },
  { id: 'tr-kadin', name: 'Türkçe kadın vokaller', category: 'turkce', playlist: '822891991' },
  // Global
  { id: 'global-top', name: 'Dünya Top 100', category: 'global', playlist: '3155776842' },
  { id: 'global-trend', name: 'Popüler yabancı pop', category: 'global', playlist: '1550014861' },
  // Türler
  { id: 'genre-pop', name: 'Pop klasikleri', category: 'tur', playlist: '1036183001' },
  { id: 'genre-rock', name: 'Rock klasikleri', category: 'tur', playlist: '1306931615' },
  { id: 'genre-rap10', name: "Rap 2010'lar", category: 'tur', playlist: '7662551722' },
  { id: 'genre-rap20', name: "Rap 2020'ler", category: 'tur', playlist: '12547421383' },
  { id: 'genre-rnb', name: "R&B 2000'ler", category: 'tur', playlist: '2021626162' },
  { id: 'genre-kpop', name: 'K-Pop', category: 'tur', playlist: '4096400722' },
  { id: 'genre-disney', name: 'Disney şarkıları', category: 'tur', playlist: '1962379246' },
  { id: 'genre-eurovision', name: 'Eurovision hitleri', category: 'tur', playlist: '12593394863' },
  // Dönemler
  { id: 'era-80s', name: "80'ler", category: 'donem', playlist: '867825522' },
  { id: 'era-90s', name: "90'lar", category: 'donem', playlist: '878989033' },
  { id: 'era-00s', name: "2000'ler", category: 'donem', playlist: '248297032' },
  { id: 'era-10s', name: "2010'lar", category: 'donem', playlist: '8282573142' },
  { id: 'era-20s', name: "2020'ler", category: 'donem', playlist: '13650084141' },
  // Ülke listeleri
  { id: 'chart-us', name: 'ABD Top 100', category: 'ulke', playlist: '1313621735' },
  { id: 'chart-uk', name: 'İngiltere Top 100', category: 'ulke', playlist: '1111142221' },
  { id: 'chart-de', name: 'Almanya Top 100', category: 'ulke', playlist: '1111143121' },
];
