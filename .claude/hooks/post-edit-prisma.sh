#!/bin/bash
# PostToolUse hook: Auto-generate Prisma client when schema changes
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if [[ "$FILE_PATH" == *"schema.prisma"* ]]; then
  cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
  npx prisma generate 2>&1
fi
exit 0
