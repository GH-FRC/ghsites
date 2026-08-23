#!/usr/bin/env bash

set -Eeuo pipefail

required_variables=(
  PUBLIC_GITHUB_TOKEN
  PUBLIC_REPOSITORY
  PUBLIC_SHA
  PUBLIC_RUN_URL
  ENVIRONMENT_NAME
  ENVIRONMENT_URL
  DEPLOYMENT_STATE
  DEPLOYMENT_LABEL
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Required environment variable '${variable_name}' is missing." >&2
    exit 1
  fi
done

if [[ ! "${PUBLIC_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'The public commit must be a full Git SHA.' >&2
  exit 1
fi

if [[ "${DEPLOYMENT_STATE}" != 'success' && "${DEPLOYMENT_STATE}" != 'failure' ]]; then
  echo 'The deployment state must be success or failure.' >&2
  exit 1
fi

deployment_id="$({
  printf '{'
  printf '"ref":"%s",' "${PUBLIC_SHA}"
  printf '"environment":"%s",' "${ENVIRONMENT_NAME}"
  printf '"description":"Mirror the private %s deployment result.",' "${DEPLOYMENT_LABEL}"
  printf '"auto_merge":false,'
  printf '"required_contexts":[]'
  printf '}'
} | GH_TOKEN="${PUBLIC_GITHUB_TOKEN}" gh api \
  --method POST \
  "repos/${PUBLIC_REPOSITORY}/deployments" \
  --input - \
  --jq '.id')"

GH_TOKEN="${PUBLIC_GITHUB_TOKEN}" gh api \
  --method POST \
  "repos/${PUBLIC_REPOSITORY}/deployments/${deployment_id}/statuses" \
  --field state="${DEPLOYMENT_STATE}" \
  --field description="The private ${DEPLOYMENT_LABEL} deployment completed with ${DEPLOYMENT_STATE}." \
  --field environment_url="${ENVIRONMENT_URL}" \
  --field log_url="${PUBLIC_RUN_URL}" \
  --silent
