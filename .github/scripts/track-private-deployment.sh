#!/usr/bin/env bash

set -Eeuo pipefail

required_variables=(
  PUBLIC_GITHUB_TOKEN
  PRIVATE_GITHUB_TOKEN
  PUBLIC_REPOSITORY
  PUBLIC_SHA
  PUBLIC_RUN_URL
  PRIVATE_REPOSITORY
  PRIVATE_WORKFLOW
  PRIVATE_REF
  PRIVATE_RUN_NAME_PREFIX
  ENVIRONMENT_NAME
  ENVIRONMENT_URL
  DEPLOYMENT_LABEL
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Required environment variable '${variable_name}' is missing." >&2
    exit 1
  fi
done

deployment_id="$({
  printf '{'
  printf '"ref":"%s",' "${PUBLIC_SHA}"
  printf '"environment":"%s",' "${ENVIRONMENT_NAME}"
  printf '"description":"Deploy the approved %s website through the private content repository.",' "${DEPLOYMENT_LABEL}"
  printf '"auto_merge":false,'
  printf '"required_contexts":[]'
  printf '}'
} | GH_TOKEN="${PUBLIC_GITHUB_TOKEN}" gh api \
  --method POST \
  "repos/${PUBLIC_REPOSITORY}/deployments" \
  --input - \
  --jq '.id')"

update_public_deployment() {
  local state="$1"
  local description="$2"

  GH_TOKEN="${PUBLIC_GITHUB_TOKEN}" gh api \
    --method POST \
    "repos/${PUBLIC_REPOSITORY}/deployments/${deployment_id}/statuses" \
    --field state="${state}" \
    --field description="${description}" \
    --field environment_url="${ENVIRONMENT_URL}" \
    --field log_url="${PUBLIC_RUN_URL}" \
    --silent
}

completed=false
mark_failed() {
  if [[ "${completed}" != 'true' ]]; then
    update_public_deployment failure "The private ${DEPLOYMENT_LABEL} deployment did not complete successfully." || true
  fi
}
trap mark_failed EXIT

update_public_deployment in_progress "Waiting for the private ${DEPLOYMENT_LABEL} deployment."

dispatched_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
dispatch_payload="$({
  printf '{'
  printf '"ref":"%s",' "${PRIVATE_REF}"
  printf '"inputs":{"public_sha":"%s"}' "${PUBLIC_SHA}"
  printf '}'
})"
printf '%s' "${dispatch_payload}" | GH_TOKEN="${PRIVATE_GITHUB_TOKEN}" gh api \
  --method POST \
  "repos/${PRIVATE_REPOSITORY}/actions/workflows/${PRIVATE_WORKFLOW}/dispatches" \
  --input - \
  --silent

expected_private_run_name="${PRIVATE_RUN_NAME_PREFIX} ${PUBLIC_SHA}"
export EXPECTED_PRIVATE_RUN_NAME="${expected_private_run_name}"
run_id=''
for _ in {1..30}; do
  run_id="$(GH_TOKEN="${PRIVATE_GITHUB_TOKEN}" gh api \
    --method GET \
    "repos/${PRIVATE_REPOSITORY}/actions/workflows/${PRIVATE_WORKFLOW}/runs" \
    --field branch="${PRIVATE_REF}" \
    --field event=workflow_dispatch \
    --field created=">=${dispatched_at}" \
    --field per_page=10 \
    --jq '.workflow_runs | map(select(.display_title == env.EXPECTED_PRIVATE_RUN_NAME)) | sort_by(.created_at) | first | .id // empty')"
  [[ -n "${run_id}" ]] && break
  sleep 10
done

if [[ -z "${run_id}" ]]; then
  echo 'The dispatched private workflow run could not be found.' >&2
  exit 1
fi

conclusion=''
for _ in {1..60}; do
  run_json="$(GH_TOKEN="${PRIVATE_GITHUB_TOKEN}" gh api \
    "repos/${PRIVATE_REPOSITORY}/actions/runs/${run_id}")"
  status="$(jq -r '.status' <<<"${run_json}")"
  conclusion="$(jq -r '.conclusion // empty' <<<"${run_json}")"
  [[ "${status}" == 'completed' ]] && break
  sleep 30
done

if [[ "${conclusion}" != 'success' ]]; then
  echo "The private ${DEPLOYMENT_LABEL} deployment concluded with '${conclusion:-timeout}'." >&2
  exit 1
fi

update_public_deployment success "The ${DEPLOYMENT_LABEL} website was deployed successfully."
completed=true
trap - EXIT
