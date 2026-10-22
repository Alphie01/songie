// games/song-guess/client/pools.ts karşılığı (usePools).
import 'dart:async';

import '../../session/api.dart';
import '../../shared/models.dart';
import 'models.dart';

/// Listeleri yükler; ilk açılışta listeler arka planda dolarken yoklar.
/// `selected`: odada seçili listeler; başkasının eklediği bir liste seçiliyse adı görünsün diye istenir.
class PoolsLoader {
  PoolsLoader({required GameApi Function() api, required void Function() onChange}) : _api = api, _onChange = onChange;

  final GameApi Function() _api;
  final void Function() _onChange;
  List<PoolInfo>? pools;
  Timer? _timer;
  int _gen = 0;
  String? _key;

  /// Web'deki effect: `[api, enabled, selectedKey]` değişince yeniden yükler (liste sıfırlanmaz).
  void watch(List<String> selected) {
    final key = selected.join(',');
    if (key == _key) return;
    _key = key;
    final gen = ++_gen;
    _timer?.cancel();
    unawaited(_load(gen, key));
  }

  Future<void> _load(int gen, String key) async {
    try {
      final res = await _api().get('/pools${key.isNotEmpty ? '?selected=${Uri.encodeComponent(key)}' : ''}');
      if (gen != _gen) return;
      pools = res.objs('pools').map(PoolInfo.fromJson).toList();
      _onChange();
      if (pools!.length < 5) _timer = Timer(const Duration(seconds: 3), () => _load(gen, key));
    } on Object {
      if (gen == _gen) _timer = Timer(const Duration(seconds: 3), () => _load(gen, key));
    }
  }

  /// `setPools(fn)`.
  void update(List<PoolInfo>? Function(List<PoolInfo>? current) fn) {
    pools = fn(pools);
    _onChange();
  }

  void dispose() {
    _gen++;
    _timer?.cancel();
  }
}
