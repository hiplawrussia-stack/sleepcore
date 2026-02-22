#!/bin/bash
# Install git pre-commit hook for running tests

HOOK_FILE="../.git/hooks/pre-commit"

cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

echo "Running Android tests before commit..."

cd android-companion

# Run only fast unit tests (skip slow integration tests)
./gradlew testDebugUnitTest --no-daemon -q

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Commit aborted."
    exit 1
fi

echo "✅ Tests passed."
EOF

chmod +x "$HOOK_FILE"
echo "Pre-commit hook installed!"
