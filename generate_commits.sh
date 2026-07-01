#!/bin/bash

# ==============================================================================
# Script Name: generate_commits.sh
# Description: Automatically generates Git commits with backdated timestamps
#              for any missing days in July 2026 (from July 1 through today).
#              Designed for Linux/macOS environments.
# ==============================================================================

# Exit immediately if any command exits with a non-zero status
set -e

# Target date configuration
TARGET_YEAR=2026
TARGET_MONTH="07"

# Check if inside a Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: This script must be run inside a Git repository." >&2
    exit 1
fi

# Detect current system date info
CURRENT_YEAR=$(date +"%Y")
CURRENT_MONTH=$(date +"%m")
CURRENT_DAY=$(date +"%d")
TZ_OFFSET=$(date +"%z" 2>/dev/null || echo "+0000")

# Ensure timezone offset has a valid format (e.g. +0530), default to +0000 if not
if [ -z "$TZ_OFFSET" ] || [[ ! "$TZ_OFFSET" =~ ^[+-][0-9]{4}$ ]]; then
    TZ_OFFSET="+0000"
fi

# Determine the end day (run up to today if in July 2026, otherwise do the full 31 days)
if [ "$CURRENT_YEAR" -eq "$TARGET_YEAR" ] && [ "$CURRENT_MONTH" -eq "$TARGET_MONTH" ]; then
    # Force base 10 arithmetic to avoid octal conversion issues (e.g. 08, 09)
    END_DAY=$((10#$CURRENT_DAY))
else
    END_DAY=31
fi

echo "=========================================================="
echo "          Git Backdated Commit Generator                  "
echo "=========================================================="
echo "Targeting Range: July 1, ${TARGET_YEAR} through July ${END_DAY}, ${TARGET_YEAR}"
echo "Current Timezone Offset: ${TZ_OFFSET}"
echo "----------------------------------------------------------"

# Define meaningful commit messages to pick randomly
COMMIT_MESSAGES=(
    "Initial setup"
    "Fix bugs"
    "Update documentation"
    "Refactor code"
    "Improve UI"
    "Add feature"
    "Optimize performance"
    "Code cleanup"
    "Update dependencies"
    "Add tests"
)

# Fetch existing commit dates in July 2026 to skip days that already have contributions
echo "Scanning Git history for existing July ${TARGET_YEAR} commits..."
EXISTING_DATES=$(git log --pretty=format:"%ad" --date=format:"%Y-%m-%d" | tr -d '\r' | grep "^${TARGET_YEAR}-${TARGET_MONTH}-" | sort -u || true)

if [ -n "$EXISTING_DATES" ]; then
    echo "Existing commits found on:"
    echo "$EXISTING_DATES" | sed 's/^/  - /'
else
    echo "No existing commits found for July ${TARGET_YEAR}."
fi
echo "----------------------------------------------------------"

# Define the file to log random activities
ACTIVITY_FILE="activity.txt"
touch "$ACTIVITY_FILE"

TOTAL_COMMITS=0
DAYS_PROCESSED=0

# Iterate day by day from July 1st up to END_DAY
for ((day=1; day<=END_DAY; day++)); do
    # Format day to 2 digits (e.g. 01, 02)
    DAY_STR=$(printf "%02d" "$day")
    DATE_STR="${TARGET_YEAR}-${TARGET_MONTH}-${DAY_STR}"

    # Check if this day is already present in the existing commit log
    if echo "$EXISTING_DATES" | grep -q "^${DATE_STR}$"; then
        echo "[SKIPPED] ${DATE_STR} already has contributions."
        continue
    fi

    echo "[WORKING] Generating contributions for ${DATE_STR}..."

    # Determine random count of commits for this day (between 10 and 15)
    NUM_COMMITS=$(( (RANDOM % 6) + 10 ))
    echo "  -> Preparing ${NUM_COMMITS} commits..."

    # Generate random times between 9:00 AM and 10:00 PM (hour 9 to 21 inclusive)
    TIMES=()
    for ((c=0; c<NUM_COMMITS; c++)); do
        HOUR=$(( (RANDOM % 13) + 9 )) # 9 to 21
        MIN=$(( RANDOM % 60 ))
        SEC=$(( RANDOM % 60 ))
        TIMES+=($(printf "%02d:%02d:%02d" "$HOUR" "$MIN" "$SEC"))
    done

    # Sort generated times chronologically for a natural linear commit history
    SORTED_TIMES=($(printf "%s\n" "${TIMES[@]}" | sort))

    # Perform the commits for the sorted times
    for TIME_STR in "${SORTED_TIMES[@]}"; do
        # Formulate full timestamp
        COMMIT_DATE="${DATE_STR} ${TIME_STR} ${TZ_OFFSET}"

        # Choose a random commit message from the list
        MSG_INDEX=$(( RANDOM % ${#COMMIT_MESSAGES[@]} ))
        MSG="${COMMIT_MESSAGES[$MSG_INDEX]}"

        # Write unique content to the activity log to ensure a real change is committed
        echo "Activity on ${COMMIT_DATE} - ${MSG} - ID: ${RANDOM}" >> "$ACTIVITY_FILE"

        # Stage changes
        git add "$ACTIVITY_FILE"

        # Backdate the commit using Git environment variables
        export GIT_AUTHOR_DATE="$COMMIT_DATE"
        export GIT_COMMITTER_DATE="$COMMIT_DATE"

        # Commit changes silently
        git commit -m "$MSG" > /dev/null

        TOTAL_COMMITS=$((TOTAL_COMMITS + 1))
    done

    echo "  -> Successfully committed ${NUM_COMMITS} changes for ${DATE_STR}."
    DAYS_PROCESSED=$((DAYS_PROCESSED + 1))
done

# Clear out the environment variables to avoid affecting any subsequent Git actions
unset GIT_AUTHOR_DATE
unset GIT_COMMITTER_DATE

echo "----------------------------------------------------------"
echo "Process Complete!"
echo "Total days backdated: ${DAYS_PROCESSED}"
echo "Total commits made  : ${TOTAL_COMMITS}"
echo "----------------------------------------------------------"

# Identify current branch name to push to
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)

# Push the newly generated commits to the remote repository
if git remote | grep -q "origin"; then
    echo "Pushing commits to remote repository origin branch '${CURRENT_BRANCH}'..."
    git push origin "$CURRENT_BRANCH"
    echo "Push complete!"
else
    echo "Warning: No remote repository 'origin' configured. Skipping push."
fi
echo "=========================================================="
