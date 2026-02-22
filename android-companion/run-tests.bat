@echo off
REM Run Android unit tests

echo Running unit tests...

set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

call gradlew.bat testDebugUnitTest --no-daemon

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Tests FAILED
    exit /b 1
)

echo.
echo ✅ All tests PASSED
