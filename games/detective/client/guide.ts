import type { GameGuide } from '@songie/game-kit/client';
import { HINT_PENALTY, HINTS_PER_ACT, MAX_TIME_BONUS, TIME_BONUS_PER_HOUR } from '../shared/index.js';

export const guide: GameGuide = {
  summary:
    'Bir vaka dosyasını ekipçe açarsınız: ifadeler, raporlar, telefon kayıtları, fişler, fotoğraflar. Hangi izin peşine düşeceğinize birlikte karar verir, sonunda faili, yöntemi ve nedeni ortak bir formla açıklarsınız.',
  players: '1–8 oyuncu, herkes aynı ekipte',
  duration: '30–150 dk, istenirse birkaç oturumda',
  sections: [
    {
      title: 'Bölümler',
      body:
        'Her vaka 2–5 bölümden oluşur. Bölüm bir açılış sahnesiyle başlar ve dosyaya ilk belgeleri ekler. Herkes "Okudum, devam" deyince ya da oda sahibi beklemeden başlatınca masaya geçilir.\n\nBölümün kilit izleri açılınca ya da bölüme ayrılan saat harcanınca sonraki bölüm gelir. Önceki sahneleri panodan yeniden okuyabilirsiniz.',
    },
    {
      title: 'İzler ve saat bütçesi',
      body:
        'Sağ sütunda açılabilir izler durur: "Kapıcıyla yeniden görüş", "Banka kayıtlarını iste" gibi. Her izin bir saat maliyeti vardır ve vakanın toplam bir saat bütçesi bulunur. Bütçe dolunca yeni iz açılamaz.\n\nOylama modunda biri bir iz önerir, gereken evet sayısına ulaşınca iz açılır. Aynı anda tek öneri olur; öneren ya da oda sahibi geri çekebilir. Oda sahibi modunda herkes önerir ama izi oda sahibi açar. Oda sahibi her iki modda da izi doğrudan açabilir.',
      tip: 'Her iz yeni belge getirmez ama her saat puandan yer. Önce elinizdeki belgeleri iyice okuyun.',
    },
    {
      title: 'Ortak dosya',
      items: [
        { term: 'Kanıt dolabı', text: 'Açılan bütün belgeler. Birini seçince gerçek hâliyle açılır; büyütebilir, iğneleyebilir, not düşebilirsin.', tone: 'green' },
        { term: 'Pano', text: 'Şüpheliler, mekânlar ve krokiler, belgelerden çıkan saatlerle zaman çizelgesi. Şüphelileri herkes için "şüpheli" ya da "temiz" diye işaretleyin.', tone: 'neutral' },
        { term: 'Ortak not defteri', text: 'Herkesin aynı anda gördüğü defter. Çelişkileri ve saatleri buraya yazın.', tone: 'yellow' },
        { term: 'Olay akışı', text: 'Kim hangi izi açtı, kim not düştü; masada olan her şey.', tone: 'neutral' },
      ],
    },
    {
      title: 'Amirden ipucu',
      body: `Takılırsanız amirden ipucu isteyebilirsiniz: her bölümde en fazla ${HINTS_PER_ACT} ipucu, her biri sonuçtan ${HINT_PENALTY} puan düşer. İpuçları hafiften yön vericiye doğru gider. Oda sahibi lobide ipuçlarını tamamen kapatabilir.`,
    },
    {
      title: 'Dosyayı kapatma ve ortak çözüm',
      body:
        'Yeterince bildiğinizi düşününce dosyayı kapatın: oylama modunda kapatma önerilir, oda sahibi doğrudan da kapatabilir. Sonra herkes suçlama formunu kendisi doldurur: kim, nasıl, neden ve hangi belge kanıtlıyor.\n\nOda sahibi formları toplayınca cevaplar yan yana gelir. Her soruda çoğunluğun cevabı seçilidir; oda sahibi tartışmaya göre değiştirip ekip cevabını teslim eder. İsterse teslimden önce soruşturmaya geri dönülebilir.',
    },
    {
      title: 'Puan ve dereceler',
      body: `Ekip cevabındaki her doğru soru kendi puanını getirir. Hedef saatin altında kalan her saat ${TIME_BONUS_PER_HOUR} bonus puan (en fazla ${MAX_TIME_BONUS}), her ipucu ${HINT_PENALTY} puan ceza. Sonuç ekranında gerçekte ne olduğunu, gerçek zaman çizelgesini, bulduğunuz ve kaçırdığınız kanıtları ve herkesin sırrını görürsünüz.`,
      items: [
        { term: 'Stajyer', text: 'Dosya henüz çözülmedi; bir dahaki sefere.', tone: 'neutral' },
        { term: 'Komiser Yardımcısı', text: 'Doğru yoldasınız ama zincirde eksik halkalar var.', tone: 'yellow' },
        { term: 'Komiser', text: 'Fail ve yöntem doğru, dosya sağlam.', tone: 'orange' },
        { term: 'Başkomiser', text: 'Neredeyse kusursuz: doğru cevaplar, az saat, az ipucu.', tone: 'green' },
      ],
    },
  ],
};
