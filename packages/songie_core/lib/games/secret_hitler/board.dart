// games/secret-hitler/client/PlayView.tsx: Tracks, Strip, RoleCard, Seats, Log, HowTo.
import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'glyphs.dart';
import 'models.dart';
import 'strings.dart';

/// `.sh-h`: küçük büyük harf başlık (h2: Baloo).
TextStyle shHeading() => T.d(12, color: ShC.dim, letterSpacing: 1.5, height: 1.05);

/// `.sh-hint`
TextStyle shHint() => T.b(13, color: C.text2, weight: FontWeight.w700, height: 1.4);

// ---------- Pistler ----------

class ShTracks extends StatelessWidget {
  const ShTracks({super.key, required this.view});
  final SecretHitlerView view;

  Widget _slot({required String party, required bool filled, bool gate = false, String? power}) {
    final side = sideColor(party);
    final glyph = power == null ? null : Center(child: PowerGlyph(power: power, size: 18, color: sideInk(party)));
    // Web'de `title` (yetki ya da Hitler bölgesi) ve simgenin `aria-label`'ı.
    final label = power != null ? '${powerNames[power]}: ${powerHints[power]}' : (gate ? SPlay.hitlerSlot : null);
    final Widget slot = filled
        ? Semantics(
            label: label,
            child: Container(
              height: 46,
              decoration: BoxDecoration(color: side, border: Border.all(color: ShC.edge, width: 3), borderRadius: BorderRadius.circular(10)),
            ),
          )
        : Semantics(
            label: label,
            child: Container(
              height: 46,
              decoration: BoxDecoration(color: party == 'fascist' ? C.red.withValues(alpha: 0.15) : null, borderRadius: BorderRadius.circular(10)),
              child: CustomPaint(
                painter: DashedRRectPainter(color: side, radius: 10, strokeWidth: 3, dash: 6, gap: 3),
                child: SizedBox.expand(child: glyph),
              ),
            ),
          );
    // `[data-gate]`: box-shadow 0 0 0 2px kırmızı (yalnızca kutunun dışında; yarı saydam zeminin altında görünmez).
    return gate ? CustomPaint(painter: const _GateRing(), child: slot) : slot;
  }

  Widget _slots(List<Widget> slots) => Row(
    children: [
      for (var i = 0; i < slots.length; i++) ...[
        if (i > 0) const SizedBox(width: 6),
        Expanded(child: slots[i]),
      ],
    ],
  );

  @override
  Widget build(BuildContext context) {
    final label = T.d(12, letterSpacing: 1.5, height: 1.05);
    return Semantics(
      label: '${SPlay.liberalTrack}, ${SPlay.fascistTrack}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: gapped(12, [
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: gapped(5, [
              Text(trUpper(SPlay.trackCount(SPlay.liberalTrack, view.liberal, liberalToWin)), style: label.copyWith(color: ShC.libInk)),
              _slots([for (var i = 0; i < liberalToWin; i++) _slot(party: 'liberal', filled: i < view.liberal)]),
            ]),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: gapped(5, [
              Text(trUpper(SPlay.trackCount(SPlay.fascistTrack, view.fascist, fascistToWin)), style: label.copyWith(color: ShC.fasInk)),
              _slots([
                for (var i = 0; i < view.track.length; i++)
                  _slot(party: 'fascist', filled: i < view.fascist, gate: i == hitlerZone - 1, power: i >= view.fascist ? view.track[i] : null),
              ]),
              Text(view.fascist >= vetoAt ? SPlay.vetoZone : SPlay.hitlerZone, style: T.b(12, color: ShC.fasInk, weight: FontWeight.w700)),
            ]),
          ),
          Row(
            children: [
              Text(SPlay.tracker, style: T.b(12, color: C.text3, weight: FontWeight.w800)),
              const SizedBox(width: 8),
              Semantics(
                label: '${SPlay.tracker} ${view.electionTracker}/3',
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (var i = 0; i < 3; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i < view.electionTracker ? C.yellow : null,
                          border: Border.all(color: i < view.electionTracker ? ShC.edge : C.violet, width: 2),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  SPlay.pileInfo(view.deckCount, view.discardCount),
                  style: T.b(12, color: C.text3, weight: FontWeight.w800),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        ]),
      ),
    );
  }
}

/// Kutunun 2px dışına çizilen halka (CSS dış gölgesi gibi kutunun içine taşmaz).
class _GateRing extends CustomPainter {
  const _GateRing();

  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(10)).inflate(1);
    canvas.drawRRect(
      rrect,
      Paint()
        ..color = C.red
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(_GateRing old) => false;
}

// ---------- Oyuncu şeridi ----------

/// `.sh-strip`: `repeat(auto-fit, minmax(58px, 1fr))`, aralık 6. [width] orta sütunun genişliği.
class ShStrip extends StatelessWidget {
  const ShStrip({super.key, required this.view, required this.members, required this.meId, required this.knownRoles, required this.width});
  final SecretHitlerView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final Map<String, String> knownRoles;
  final double width;

  @override
  Widget build(BuildContext context) {
    final showVotes = view.phase != 'vote' && view.lastVote != null;
    final tracks = math.max(1, ((width + 6) / (58 + 6)).floor());
    final cols = math.max(1, math.min(tracks, view.seats.length));
    return Semantics(
      label: SPlay.seats,
      child: Grid2(
        columns: cols,
        rowGap: 6,
        columnGap: 6,
        equalHeight: true,
        children: [
          for (final seat in view.seats)
            Builder(
              builder: (context) {
                final m = members[seat.id];
                final role = knownRoles[seat.id];
                final isPres = view.president == seat.id;
                final isChan = view.chancellor == seat.id;
                final vote = showVotes ? view.lastVote!.votes[seat.id] : null;
                final kind = isPres ? 'pres' : (isChan ? 'chan' : null);
                final status = !seat.alive
                    ? SPlay.deadShort
                    : isPres
                    ? SPlay.president
                    : isChan
                    ? (view.phase == 'nominate' || view.phase == 'vote' ? SPlay.nominee : SPlay.chancellor)
                    : seat.voted
                    ? SPlay.voted
                    : vote != null
                    ? (vote == 'ja' ? SPlay.ja : SPlay.nein)
                    : role != null
                    ? (roleNames[role] ?? '')
                    : '';
                final fg = kind != null ? C.ink2 : C.text;
                final style = T.b(11, color: fg, weight: FontWeight.w800, height: 1.35);
                return Opacity(
                  opacity: seat.alive ? 1 : 0.5,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
                    decoration: BoxDecoration(
                      color: kind == 'pres' ? C.yellow : (kind == 'chan' ? C.lilac : C.bg),
                      border: Border.all(color: kind != null ? ShC.edge : (role != null ? sideColor(roleParty(role)) : ShC.soft), width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Text(m?.nick ?? '?', style: style, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
                        Text(status.isEmpty ? ' ' : status, style: style, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

// ---------- Rol kartı: varsayılan kapalı, basılı tutunca açılır ----------

class ShRoleCard extends StatelessWidget {
  const ShRoleCard({super.key, required this.view, required this.nick, required this.reveal, required this.setReveal});
  final SecretHitlerView view;
  final String Function(String id) nick;
  final bool reveal;
  final void Function(bool v) setReveal;

  @override
  Widget build(BuildContext context) {
    final me = view.me!;
    final party = roleParty(me.role);
    final blurb = me.role == 'liberal'
        ? SPlay.roleLiberal
        : me.role == 'fascist'
        ? SPlay.roleFascist
        : me.known.isNotEmpty
        ? SPlay.roleHitlerKnows
        : SPlay.roleHitlerBlind;
    final bg = !reveal ? C.lilac : (me.role == 'hitler' ? C.red : sideColor(party));
    final team = T.b(13, color: C.ink2, weight: FontWeight.w800, height: 1.15);

    final face = reveal
        ? Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(SPlay.roleOpen(roleNames[me.role] ?? '', blurb), style: T.d(16, color: C.ink2, height: 1.15), textAlign: TextAlign.center),
              if (me.known.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  '${SPlay.roleTeam}: ${me.known.map((k) => '${nick(k.id)} (${roleNames[k.role]})').join(', ')}',
                  style: team,
                  textAlign: TextAlign.center,
                ),
              ],
              if (me.investigations.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  '${SPlay.investigations}: ${me.investigations.map((r) => '${nick(r.target)} ${trLower(partyNames[r.party] ?? '')}').join(', ')}',
                  style: team,
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          )
        : Text(SPlay.roleHold, style: T.d(19, color: C.ink2, height: 1.15), textAlign: TextAlign.center);

    // `touch-action: none`: kart üzerinde başlayan sürükleme sayfayı kaydırmaz; bırakınca (nerede olursa) kapanır.
    return Semantics(
      button: true,
      toggled: reveal,
      label: '${SPlay.roleHold}. ${SPlay.roleHoldHint}',
      child: Listener(
        behavior: HitTestBehavior.opaque,
        onPointerDown: (_) => setReveal(true),
        onPointerUp: (_) => setReveal(false),
        onPointerCancel: (_) => setReveal(false),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onVerticalDragStart: (_) {},
          onHorizontalDragStart: (_) {},
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 80),
            curve: Curves.ease,
            transform: Matrix4.translationValues(0, reveal ? 4 : 0, 0),
            // Gölge ve kayma 80 ms'de geçer; zemin rengi anında değişir (CSS'teki gibi).
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), boxShadow: hardShadow(0, reveal ? 2 : 6, ShC.edge)),
            child: Container(
              constraints: const BoxConstraints(minHeight: 66),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              alignment: Alignment.center,
              decoration: BoxDecoration(color: bg, border: Border.all(color: ShC.edge, width: 3), borderRadius: BorderRadius.circular(20)),
              child: face,
            ),
          ),
        ),
      ),
    );
  }
}

// ---------- Masa ----------

class ShSeats extends StatelessWidget {
  const ShSeats({super.key, required this.view, required this.members, required this.meId, required this.knownRoles, required this.width});
  final SecretHitlerView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final Map<String, String> knownRoles;

  /// Orta sütunun genişliği (etiketlerin sığacağı yer için).
  final double width;

  Widget _tag(String text, {Color? bg, Color border = ShC.soft, Color color = C.text2}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
    decoration: BoxDecoration(color: bg, border: Border.all(color: border, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: Text(text, style: T.b(11, color: color, weight: FontWeight.w800)),
  );

  @override
  Widget build(BuildContext context) {
    final showVotes = view.phase != 'vote' && view.lastVote != null;
    // .sh-seat: 3px çerçeve + 12px yan boşluk, 28px avatar, iki 10px aralık.
    final tagsMax = math.max(0.0, width - 6 - 24 - 28 - 20);
    return VStack(
      gap: 6,
      children: [
        for (final seat in view.seats)
          Builder(
            builder: (context) {
              final m = members[seat.id];
              final role = knownRoles[seat.id];
              final vote = showVotes ? view.lastVote!.votes[seat.id] : null;
              final isPres = view.president == seat.id && view.phase != 'over';
              final isChan = view.chancellor == seat.id && view.phase != 'over';
              final isMe = seat.id == meId;
              final dead = !seat.alive;
              final nameColor = dead ? C.text3 : C.text;
              final tags = <Widget>[
                if (role != null)
                  _tag(
                    roleNames[role] ?? '',
                    bg: role == 'liberal' ? C.sky : (role == 'fascist' ? C.coral : C.red),
                    border: ShC.edge,
                    color: C.ink2,
                  ),
                if (dead) _tag(SPlay.dead, color: C.text3),
                if (isPres) _tag(SPlay.president, bg: C.yellow, border: ShC.edge, color: C.ink2),
                if (isChan)
                  _tag(view.phase == 'nominate' || view.phase == 'vote' ? SPlay.nominee : SPlay.chancellor, bg: C.lilac, border: ShC.edge, color: C.ink2),
                if (seat.voted) _tag(SPlay.voted, bg: C.mint, border: ShC.edge, color: C.ink2),
                if (vote != null)
                  _tag(vote == 'ja' ? SPlay.ja : SPlay.nein, bg: vote == 'ja' ? C.paper : ShC.nein, border: ShC.edge, color: vote == 'ja' ? C.ink2 : C.text),
              ];
              return Container(
                constraints: const BoxConstraints(minHeight: 44),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: C.bg,
                  border: Border.all(color: isMe ? C.yellow : ShC.edge, width: 3),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    SAvatar(
                      avatar: m?.avatar ?? const Avatar(color: 'mint'),
                      nick: m?.nick ?? '?',
                      size: 28,
                      dim: dead || !(m?.connected ?? false),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          text: m?.nick ?? '?',
                          children: [if (isMe) TextSpan(text: ' (${SPlay.you})', style: const TextStyle(color: C.text3))],
                        ),
                        style: T.b(14, color: nameColor, weight: FontWeight.w800).copyWith(
                          decoration: dead ? TextDecoration.lineThrough : null,
                          decorationColor: C.text3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (tags.isNotEmpty) ...[
                      const SizedBox(width: 10),
                      ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: tagsMax),
                        child: Wrap(spacing: 4, runSpacing: 4, children: tags),
                      ),
                    ],
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}

// ---------- Günlük ----------

class ShLog extends StatelessWidget {
  const ShLog({super.key, required this.view, required this.nick});
  final SecretHitlerView view;
  final String Function(String id) nick;

  @override
  Widget build(BuildContext context) {
    final entries = view.log.reversed.toList();
    return VStack(
      gap: 10,
      children: [
        Semantics(header: true, child: Text(trUpper(SPlay.log), style: shHeading())),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 420),
          child: ListView.separated(
            shrinkWrap: true,
            padding: EdgeInsets.zero,
            itemCount: entries.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final e = entries[i];
              final over = e.k == 'over';
              final color = over
                  ? C.yellow
                  : e.k == 'enact' && e.policy == 'liberal'
                  ? ShC.libInk
                  : e.k == 'enact' && e.policy == 'fascist'
                  ? ShC.fasInk
                  : C.text2;
              return Text(logText(e, nick), style: T.b(13, color: color, weight: over ? FontWeight.w800 : FontWeight.w700, height: 1.4));
            },
          ),
        ),
      ],
    );
  }
}

// ---------- Nasıl oynanır + lisans ----------

/// `border-top: 3px dashed var(--violet)` (Chromium: 3px çizgide 6px çizgi, 3px boşluk).
class _DashedTop extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = C.violet
      ..strokeWidth = 3;
    for (double x = 0; x < size.width; x += 9) {
      canvas.drawLine(Offset(x, 1.5), Offset((x + 6).clamp(0, size.width), 1.5), p);
    }
  }

  @override
  bool shouldRepaint(_DashedTop old) => false;
}

class ShHowTo extends StatelessWidget {
  const ShHowTo({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: CustomPaint(
      painter: _DashedTop(),
      child: Padding(
        padding: const EdgeInsets.only(top: 3 + 28),
        child: VStack(
          gap: 16,
          children: [
            Semantics(header: true, child: Text(SHowto.title, style: T.d(22, color: C.text, height: 1.05))),
            VStack(
              gap: 16,
              children: [
                for (var i = 0; i < SHowto.steps.length; i++)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(padding: const EdgeInsets.only(top: 2), child: Text('${i + 1}', style: T.d(16, color: C.yellow, height: 1.45))),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(SHowto.steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                            const SizedBox(height: 2),
                            Text(SHowto.steps[i].$2, style: T.b(13, color: C.text2)),
                          ],
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const _License(),
          ],
        ),
      ),
    ),
  );
}

/// `.sh-license`: bağlantılar dış tarayıcıda açılır.
class _License extends StatefulWidget {
  const _License();

  @override
  State<_License> createState() => _LicenseState();
}

class _LicenseState extends State<_License> {
  late final _licenseTap = TapGestureRecognizer()..onTap = () => _open(licenseUrl);
  late final _siteTap = TapGestureRecognizer()..onTap = () => _open(siteUrl);

  Future<void> _open(String url) async {
    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (_) {
      // Tarayıcı açılamazsa sessizce geç.
    }
  }

  @override
  void dispose() {
    _licenseTap.dispose();
    _siteTap.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const link = TextStyle(color: C.text2, decoration: TextDecoration.underline, decorationColor: C.text2);
    return Text.rich(
      TextSpan(
        children: [
          const TextSpan(text: SHowto.licenseBefore),
          TextSpan(text: SHowto.licenseName, style: link, recognizer: _licenseTap),
          const TextSpan(text: SHowto.licenseAfter),
          TextSpan(text: SHowto.licenseSite, style: link, recognizer: _siteTap),
        ],
      ),
      style: T.b(12, color: C.text3, weight: FontWeight.w700, height: 1.55),
    );
  }
}
