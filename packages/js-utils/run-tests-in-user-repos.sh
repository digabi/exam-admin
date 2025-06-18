#!/bin/bash

## This script runs given workflow in each repo that uses this package.
## For example when you want to run unit-tests in all repos that use this package

ORG=digabi
SOURCE_REPO=js-utils
PACKAGE=@digabi/js-utils
PACKAGE_USER_REPOS=()
BRANCH=feature/replace-request-with-native-fetch
WORKFLOW_FILE=ci.yml

repos=$(gh repo list "$ORG" --no-archived --json name -L 1000 | jq -r '.[].name' | grep -v "^$SOURCE_REPO$")

for repo in $repos
do
    echo "Checking $repo..."
    CONTENT=$(gh api --cache 1h repos/$ORG/$repo/contents/package.json | jq -r .content | base64 -d)

    if echo "$CONTENT" | grep -q "\"$PACKAGE\""; then
        echo "Packge $PACKAGE found in $repo, running workflow $WORKFLOW_FILE"
        PACKAGE_USER_REPOS+=("$repo")

        if ! gh api "repos/$ORG/$repo/branches/$BRANCH" >/dev/null 2>&1; then
          echo "Branch '$BRANCH' does not exist. Skipping workflow run!"
          continue
        fi

        gh workflow run $WORKFLOW_FILE --ref $BRANCH --repo "$ORG/$repo"
        sleep 10

        run_id=$(gh run list --branch $BRANCH --repo "$ORG/$repo" --workflow=$WORKFLOW_FILE --limit=1 --json databaseId --jq '.[0].databaseId')
        gh run watch "$run_id" --repo "$ORG/$repo"
    fi
done


