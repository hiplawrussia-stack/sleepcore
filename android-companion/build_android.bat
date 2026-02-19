@echo off
cd /d "C:\Users\User\Desktop\sleepcore\android-companion"
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
call "C:\Users\User\Desktop\sleepcore\android-companion\gradlew.bat" assembleDebug --no-daemon
