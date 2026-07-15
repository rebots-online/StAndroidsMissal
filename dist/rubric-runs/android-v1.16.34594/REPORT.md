# Android production verification — v1.16.34594

- Device: headless Android 35 Google APIs x86_64 emulator (`standroids-api35`), KVM accelerated.
- Artifact installed: `standroidsmissal-v1.16.34594-android-universal-release.apk` (production-signed).
- Install: streamed install succeeded.
- Cold launch: `mba.robin.standroidsmissal/.MainActivity`, 294 ms.
- Embedded identity: `versionCode=100016`, `versionName=1.16.34594`, minSdk 24, targetSdk 36.
- Automated path: launch liturgical day → Reader → Scripture Atlas → Journal & Homilies, including swipe/scroll input.
- Observed content: S. Bonaventurae day, real bilingual Mass text, canonical/imagery/parallels atlas controls, Journal timeline and Homily planner tabs.
- Logcat: no app `FATAL EXCEPTION` / process crash during the run.
- Screencast: 49.997 seconds, H.264, 320×640 at 60 fps.
- Evidence: `launch.png`, `bible.png`, `journal.png`, `window.xml`, `logcat.txt`, `standroidsmissal-prod-verification.mp4`.

Screencast SHA-256: `22fb66d815841e2c63437dc5447ca5867086074a76d51cb33f1a5eb812677610`.
