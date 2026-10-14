#!/bin/zsh
# Firebase Console'da Google sağlayıcısı açıldıktan sonra bir kez çalıştır:
#   cd apps/mobile && ./tool/configure_google.sh
# - Firebase yapılandırmasını yeniler (iOS CLIENT_ID, Android OAuth istemcileri gelir)
# - iOS'ta Google dönüş adresi için REVERSED_CLIENT_ID URL şemasını Info.plist'e ekler
set -e
cd "$(dirname "$0")/.."
export PATH="$PATH:$HOME/.pub-cache/bin"
flutterfire configure --project=songie-app --platforms=ios,android \
  --ios-bundle-id=com.monolithyazilim.songie --android-package-name=com.monolithyazilim.songie --yes

PLIST=ios/Runner/Info.plist
REVERSED=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" ios/Runner/GoogleService-Info.plist 2>/dev/null || true)
if [[ -z "$REVERSED" ]]; then
  echo "REVERSED_CLIENT_ID yok: Firebase Console > Authentication > Sign-in method > Google açık mı?" >&2
  exit 1
fi
if ! /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" $PLIST >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" $PLIST
fi
if ! grep -q "$REVERSED" $PLIST; then
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" $PLIST
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" $PLIST
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $REVERSED" $PLIST
fi
grep -q '"client_type": 3' android/app/google-services.json && echo "Android web istemcisi tamam." || echo "Uyarı: google-services.json'da web istemcisi (client_type 3) yok." >&2
echo "Google girişi yapılandırıldı: $REVERSED"
