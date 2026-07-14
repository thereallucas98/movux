#!/usr/bin/env bash
#
# api-smoke.sh — manual curl smoke test for the /api/tenants endpoints.
#
# Complements the automated Playwright API suite (tests/api/). Run this against
# a live `pnpm dev` server when debugging a new endpoint or verifying a fix
# before opening a PR.
#
# Usage:
#   chmod +x apps/web/scripts/api-smoke.sh
#   ./apps/web/scripts/api-smoke.sh                   # against localhost:3001
#   BASE=https://staging.turnora.app ./apps/web/scripts/api-smoke.sh
#
# Required: curl, jq, a running dev server + Postgres (dev DB on :5442).
# The script creates a disposable user (timestamped email) and cleans up the
# cookie jar on exit.
#
# Each test prints: ✅/❌ <name> (status=<code> expected=<expected>)

set -u

BASE="${BASE:-http://localhost:3001}"
COOKIE_JAR="$(mktemp /tmp/turnora-smoke-cookies.XXXXXX)"
PASS=0
FAIL=0

cleanup() { rm -f "$COOKIE_JAR"; }
trap cleanup EXIT

# ─── helpers ────────────────────────────────────────────────────────────────

check() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $name (status=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name (status=$actual expected=$expected)"
    FAIL=$((FAIL + 1))
  fi
}

curl_get() {
  curl -s -o /tmp/turnora-smoke-body -w "%{http_code}" -b "$COOKIE_JAR" "$@"
}

curl_post() {
  curl -s -o /tmp/turnora-smoke-body -w "%{http_code}" -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" "$@"
}

json() {
  jq -r "$1" /tmp/turnora-smoke-body
}

banner() {
  echo ""
  echo "─── $1 ───"
}

# ─── 1. Bootstrap a user and log in ──────────────────────────────────────────

banner "Register + login"

STAMP=$(date +%s)
EMAIL="smoke-${STAMP}@turnora.test"
PASSWORD="Pass1234!"

code=$(curl_post -c "$COOKIE_JAR" -X POST "$BASE/api/auth/register" \
  -d "{\"fullName\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"USER\"}")
check "POST /api/auth/register" "$code" "201"

# ─── 2. Create tenant (happy path) ───────────────────────────────────────────

banner "POST /api/tenants (happy path)"

code=$(curl_post -X POST "$BASE/api/tenants" \
  -d '{"name":"Smoke Hospital","timezone":"America/Sao_Paulo"}')
check "POST /api/tenants (201)" "$code" "201"
TENANT_ID=$(json '.tenant.id')
echo "  tenant_id=$TENANT_ID"

# ─── 3. Create tenant without auth (401) ────────────────────────────────────

banner "POST /api/tenants without cookie (401)"

code=$(curl -s -o /tmp/turnora-smoke-body -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/api/tenants" -d '{"name":"Anon"}')
check "POST /api/tenants (401 no cookie)" "$code" "401"

# ─── 4. Create tenant with bad body (400) ───────────────────────────────────

banner "POST /api/tenants with invalid body (400)"

code=$(curl_post -X POST "$BASE/api/tenants" -d '{"name":"x"}')
check "POST /api/tenants (400 short name)" "$code" "400"

# ─── 5. List tenants (200) ───────────────────────────────────────────────────

banner "GET /api/tenants"

code=$(curl_get "$BASE/api/tenants")
check "GET /api/tenants (200)" "$code" "200"

# ─── 6. Get tenant by id (200) ───────────────────────────────────────────────

banner "GET /api/tenants/:id"

code=$(curl_get "$BASE/api/tenants/$TENANT_ID")
check "GET /api/tenants/:id (200 as SUPER_ADMIN)" "$code" "200"

# ─── 7. Update tenant (200) ──────────────────────────────────────────────────

banner "PATCH /api/tenants/:id"

code=$(curl_post -X PATCH "$BASE/api/tenants/$TENANT_ID" \
  -d '{"name":"Smoke Hospital Renamed"}')
check "PATCH /api/tenants/:id (200)" "$code" "200"

# ─── 8. Update tenant without body (400) ─────────────────────────────────────

banner "PATCH /api/tenants/:id with empty body (400)"

code=$(curl_post -X PATCH "$BASE/api/tenants/$TENANT_ID" -d '{}')
check "PATCH /api/tenants/:id (400 empty)" "$code" "400"

# ─── 9. Update nonexistent tenant (404) ──────────────────────────────────────

banner "PATCH nonexistent tenant"

FAKE_ID="00000000-0000-0000-0000-000000000000"
code=$(curl_post -X PATCH "$BASE/api/tenants/$FAKE_ID" -d '{"name":"X"}')
check "PATCH /api/tenants/:id (404 not a member -> FORBIDDEN)" "$code" "403"

# ─── 10. Add member: target user not found (404) ────────────────────────────

banner "POST /api/tenants/:id/members (404 target user not found)"

code=$(curl_post -X POST "$BASE/api/tenants/$TENANT_ID/members" \
  -d "{\"userId\":\"$FAKE_ID\",\"role\":\"SUPER_ADMIN\"}")
check "POST members (404 target)" "$code" "404"

# ─── 11. Create a second user so we can add them as member ──────────────────

banner "Create second user for member flow"

STAMP2=$(date +%s%N)
EMAIL2="smoke-${STAMP2}@turnora.test"
code=$(curl -s -o /tmp/turnora-smoke-body -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/api/auth/register" \
  -d "{\"fullName\":\"Smoke Two\",\"email\":\"$EMAIL2\",\"password\":\"$PASSWORD\",\"role\":\"USER\"}")
SECOND_USER_ID=$(json '.user.id')
check "Register second user (201)" "$code" "201"

# ─── 12. Add member happy path (201) ────────────────────────────────────────

banner "POST /api/tenants/:id/members (201)"

code=$(curl_post -X POST "$BASE/api/tenants/$TENANT_ID/members" \
  -d "{\"userId\":\"$SECOND_USER_ID\",\"role\":\"SUPER_ADMIN\"}")
check "POST members (201)" "$code" "201"
MEMBER_ID=$(json '.id')

# ─── 13. Add same member again (409 ALREADY_MEMBER) ─────────────────────────

banner "POST /api/tenants/:id/members (409 duplicate)"

code=$(curl_post -X POST "$BASE/api/tenants/$TENANT_ID/members" \
  -d "{\"userId\":\"$SECOND_USER_ID\",\"role\":\"SUPER_ADMIN\"}")
check "POST members (409 ALREADY_MEMBER)" "$code" "409"

# ─── 14. List members (200) ─────────────────────────────────────────────────

banner "GET /api/tenants/:id/members"

code=$(curl_get "$BASE/api/tenants/$TENANT_ID/members")
check "GET members (200)" "$code" "200"
MEMBER_COUNT=$(json '.data | length')
echo "  members_active=$MEMBER_COUNT"

# ─── 15. Remove second member (204) ─────────────────────────────────────────

banner "DELETE /api/tenants/:id/members/:memberId"

code=$(curl_get -X DELETE "$BASE/api/tenants/$TENANT_ID/members/$MEMBER_ID")
check "DELETE members/:id (204)" "$code" "204"

# ─── 16. Remove first (last) member — LAST_SUPER_ADMIN guard (409) ──────────

banner "DELETE last SUPER_ADMIN (409)"

# Fetch the first membership id (caller is the only remaining SUPER_ADMIN)
curl_get "$BASE/api/tenants/$TENANT_ID/members" > /dev/null
FIRST_MEMBER_ID=$(json '.data[0].id')
code=$(curl_get -X DELETE "$BASE/api/tenants/$TENANT_ID/members/$FIRST_MEMBER_ID")
check "DELETE last SUPER_ADMIN (409)" "$code" "409"

# ─── 17. Create workspace under tenant (201) ───────────────────────────────

banner "POST /api/workspaces"

code=$(curl_post -X POST "$BASE/api/workspaces" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"name\":\"Unidade Central\",\"vertical\":\"HOSPITAL\"}")
check "POST /api/workspaces (201)" "$code" "201"
WORKSPACE_ID=$(json '.workspace.id')
echo "  workspace_id=$WORKSPACE_ID"

# ─── 18. List my workspaces (200) ───────────────────────────────────────────

banner "GET /api/workspaces"

code=$(curl_get "$BASE/api/workspaces")
check "GET /api/workspaces (200)" "$code" "200"

# ─── 19. List tenant workspaces (200) ───────────────────────────────────────

banner "GET /api/tenants/:id/workspaces"

code=$(curl_get "$BASE/api/tenants/$TENANT_ID/workspaces")
check "GET /api/tenants/:id/workspaces (200)" "$code" "200"

# ─── 20. Add member by email (201) ──────────────────────────────────────────

banner "POST /api/workspaces/:id/members"

code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/members" \
  -d "{\"email\":\"$EMAIL2\",\"role\":\"COLABORADOR\"}")
check "POST workspace members (201)" "$code" "201"
WS_MEMBER_ID=$(json '.id')

# ─── 21. Change member role (200) ───────────────────────────────────────────

banner "PATCH /api/workspaces/:id/members/:memberId"

code=$(curl_post -X PATCH \
  "$BASE/api/workspaces/$WORKSPACE_ID/members/$WS_MEMBER_ID" \
  -d '{"role":"COORDENADOR"}')
check "PATCH workspace member role (200)" "$code" "200"

# ─── 22. Remove member (204) ────────────────────────────────────────────────

banner "DELETE /api/workspaces/:id/members/:memberId"

code=$(curl_get -X DELETE \
  "$BASE/api/workspaces/$WORKSPACE_ID/members/$WS_MEMBER_ID")
check "DELETE workspace member (204)" "$code" "204"

# ─── 23a. List workspace categories (200, asserts Geral present) ────────────

banner "GET /api/workspaces/:id/categories"

code=$(curl_get "$BASE/api/workspaces/$WORKSPACE_ID/categories")
check "GET workspace categories (200)" "$code" "200"
geral_slug=$(json '.[] | select(.slug=="general") | .slug')
if [ "$geral_slug" = "general" ]; then
  echo "  ✅ Geral category auto-created"
else
  echo "  ❌ Geral category missing"
  FAIL=$((FAIL + 1))
fi

# ─── 23b. Create workspace category (201) ───────────────────────────────────

banner "POST /api/workspaces/:id/categories"

code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/categories" \
  -d '{"slug":"custom-smoke","name":"Custom Smoke"}')
check "POST workspace category (201)" "$code" "201"
CATEGORY_ID=$(json '.id')

# ─── 23c. Update workspace category (200) ───────────────────────────────────

banner "PATCH /api/workspaces/:id/categories/:categoryId"

code=$(curl_post -X PATCH \
  "$BASE/api/workspaces/$WORKSPACE_ID/categories/$CATEGORY_ID" \
  -d '{"name":"Renamed Smoke"}')
check "PATCH workspace category (200)" "$code" "200"

# ─── 23d. Delete workspace category (204) ───────────────────────────────────

banner "DELETE /api/workspaces/:id/categories/:categoryId"

code=$(curl_get -X DELETE \
  "$BASE/api/workspaces/$WORKSPACE_ID/categories/$CATEGORY_ID")
check "DELETE workspace category (204)" "$code" "204"

# ─── 24a. List workspace specialties (200) ──────────────────────────────────

banner "GET /api/workspaces/:id/specialties"

code=$(curl_get "$BASE/api/workspaces/$WORKSPACE_ID/specialties")
check "GET workspace specialties (200)" "$code" "200"

# ─── 24b. Create workspace specialty (201) ──────────────────────────────────

banner "POST /api/workspaces/:id/specialties"

code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/specialties" \
  -d '{"slug":"custom_smoke_role","name":"Custom Smoke Role"}')
check "POST workspace specialty (201)" "$code" "201"
SPECIALTY_ID=$(json '.id')

# ─── 24c. Update workspace specialty (200) ──────────────────────────────────

banner "PATCH /api/workspaces/:id/specialties/:specialtyId"

code=$(curl_post -X PATCH \
  "$BASE/api/workspaces/$WORKSPACE_ID/specialties/$SPECIALTY_ID" \
  -d '{"name":"Renamed Smoke Role"}')
check "PATCH workspace specialty (200)" "$code" "200"

# ─── 24d. Delete workspace specialty (204) ──────────────────────────────────

banner "DELETE /api/workspaces/:id/specialties/:specialtyId"

code=$(curl_get -X DELETE \
  "$BASE/api/workspaces/$WORKSPACE_ID/specialties/$SPECIALTY_ID")
check "DELETE workspace specialty (204)" "$code" "204"

# ─── 24e. Create workspace category for schedule (201) ──────────────────────

banner "POST /api/workspaces/:id/categories (for schedule)"

code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/categories" \
  -d '{"slug":"uti-smoke","name":"UTI Smoke"}')
check "POST workspace category for schedule (201)" "$code" "201"
SCHED_CAT_ID=$(json '.id')

# ─── 24f. Create DRAFT schedule (201) ───────────────────────────────────────

banner "POST /api/workspaces/:id/schedules"

code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/schedules" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"name\":\"Escala Smoke\",\"periodStart\":\"2026-10-01T00:00:00Z\",\"periodEnd\":\"2026-11-01T00:00:00Z\"}")
check "POST schedule (201 DRAFT)" "$code" "201"
SCHEDULE_ID=$(json '.id')

# ─── 24g. Publish schedule (200 → PUBLISHED) ────────────────────────────────

banner "POST /api/workspaces/:id/schedules/:scheduleId/publish"

code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SCHEDULE_ID/publish" \
  -d '{}')
check "POST schedule publish (200)" "$code" "200"

# ─── 24h. Close schedule (200 with closedEarly: true) ───────────────────────

banner "POST /api/workspaces/:id/schedules/:scheduleId/close"

code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SCHEDULE_ID/close" \
  -d '{}')
check "POST schedule close (200)" "$code" "200"

# ─── 24i. Delete CLOSED schedule (204 soft) ─────────────────────────────────

banner "DELETE /api/workspaces/:id/schedules/:scheduleId"

code=$(curl_get -X DELETE \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SCHEDULE_ID")
check "DELETE schedule (204)" "$code" "204"

# ─── 25. Shifts + Pattern smoke (Task 08) ───────────────────────────────────

banner "POST schedule (DRAFT for shifts)"

code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/schedules" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"name\":\"Escala Shifts\",\"periodStart\":\"2026-12-01T00:00:00Z\",\"periodEnd\":\"2027-01-01T00:00:00Z\"}")
check "POST schedule for shifts (201)" "$code" "201"
SHIFT_SCHED_ID=$(json '.id')

# 25a — Create shift on DRAFT schedule
banner "POST shift (DRAFT schedule)"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SHIFT_SCHED_ID/shifts" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"startAt\":\"2026-12-07T08:00:00Z\",\"endAt\":\"2026-12-07T17:00:00Z\",\"headcount\":2}")
check "POST shift (201)" "$code" "201"
SHIFT_ID=$(json '.id')

# 25b — Set expected composition
banner "PATCH shift expected-composition"
code=$(curl_post -X PATCH \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SHIFT_SCHED_ID/shifts/$SHIFT_ID/expected-composition" \
  -d "{\"items\":[{\"specialtyId\":\"$SPECIALTY_ID\",\"count\":2}]}")
check "PATCH expected-composition (200)" "$code" "200"

# 25c — Create pattern
banner "POST pattern"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SHIFT_SCHED_ID/patterns" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"daysOfWeek\":[1,3],\"startTimeMinutes\":480,\"endTimeMinutes\":1020,\"crossesMidnight\":false,\"headcount\":1}")
check "POST pattern (201)" "$code" "201"
PATTERN_ID=$(json '.id')

# 25d — Generate shifts from pattern
banner "POST pattern generate"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SHIFT_SCHED_ID/patterns/$PATTERN_ID/generate" \
  -d '{"rangeStart":"2026-12-01T00:00:00Z","rangeEnd":"2026-12-15T00:00:00Z"}')
check "POST pattern generate (200)" "$code" "200"

# 25e — Hard-delete shift on DRAFT
banner "DELETE shift on DRAFT (hard, 204)"
code=$(curl_get -X DELETE \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SHIFT_SCHED_ID/shifts/$SHIFT_ID")
check "DELETE shift on DRAFT (204)" "$code" "204"

# 25f — Cleanup: delete the auxiliary schedule
banner "DELETE schedule (DRAFT cleanup)"
code=$(curl_get -X DELETE \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$SHIFT_SCHED_ID")
check "DELETE shift schedule cleanup (204)" "$code" "204"

# ─── 26. Assignments smoke (Task 09) ────────────────────────────────────────

banner "GET /api/me (capture USER_ID for self-assign)"
code=$(curl_get "$BASE/api/me")
check "GET /api/me (200)" "$code" "200"
USER_ID=$(json '.id')

banner "POST schedule (PUBLISHED for assignments)"
code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/schedules" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"name\":\"Escala Assign\",\"periodStart\":\"2027-02-01T00:00:00Z\",\"periodEnd\":\"2027-03-01T00:00:00Z\"}")
check "POST schedule for assignments (201)" "$code" "201"
ASSIGN_SCHED_ID=$(json '.id')

banner "POST publish schedule"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$ASSIGN_SCHED_ID/publish" \
  -d '{}')
check "POST schedule publish for assign (200)" "$code" "200"

banner "POST shift on published schedule"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$ASSIGN_SCHED_ID/shifts" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"startAt\":\"2027-02-08T08:00:00Z\",\"endAt\":\"2027-02-08T17:00:00Z\",\"headcount\":2}")
check "POST shift for assign (201)" "$code" "201"
ASSIGN_SHIFT_ID=$(json '.id')

# 26a — Self-assign auto-ACCEPTED (USER_ID is the admin)
banner "POST self-assign (auto-ACCEPTED)"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$ASSIGN_SCHED_ID/shifts/$ASSIGN_SHIFT_ID/assignments" \
  -d "{\"userIds\":[\"$USER_ID\"]}")
check "POST self-assign (201)" "$code" "201"
ASSIGN_ID=$(json '.[0].id')

# 26b — List assignments
banner "GET shift assignments"
code=$(curl_get "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$ASSIGN_SCHED_ID/shifts/$ASSIGN_SHIFT_ID/assignments")
check "GET assignments (200)" "$code" "200"

# 26c — Get via flat route
banner "GET /api/assignments/:id (flat)"
code=$(curl_get "$BASE/api/assignments/$ASSIGN_ID")
check "GET flat assignment (200)" "$code" "200"

# 26d — Delete fails because status=ACCEPTED (self-assign)
banner "DELETE assignment (409 ACCEPTED)"
code=$(curl_get -X DELETE "$BASE/api/assignments/$ASSIGN_ID")
check "DELETE accepted assignment (409)" "$code" "409"

# ─── 27. Assignment decisions smoke (Task 10) ───────────────────────────────

# 27a — Force-accept already-accepted (should 409)
banner "POST /api/assignments/:id/force-accept (409 already accepted)"
code=$(curl_post -X POST "$BASE/api/assignments/$ASSIGN_ID/force-accept" -d '{}')
check "POST force-accept on ACCEPTED (409)" "$code" "409"

# 27b — Reject already-accepted via assignee path (Q7 Ideal — 409)
banner "POST /api/assignments/:id/reject (409 self-ACCEPTED Q7)"
code=$(curl_post -X POST "$BASE/api/assignments/$ASSIGN_ID/reject" \
  -d '{"reason":"changed mind"}')
check "POST reject self-ACCEPTED (409)" "$code" "409"

# 27c — List transfer-requests (200, empty)
banner "GET /api/workspaces/:id/transfer-requests"
code=$(curl_get "$BASE/api/workspaces/$WORKSPACE_ID/transfer-requests")
check "GET transfer-requests (200)" "$code" "200"

# 27d — Decide non-existent transfer-request (404)
banner "POST decide non-existent transfer-request (404)"
code=$(curl_post -X POST \
  "$BASE/api/transfer-requests/00000000-0000-0000-0000-000000000000/decide" \
  -d '{"decision":"REJECT","reason":"x"}')
check "POST decide non-existent TR (404)" "$code" "404"

# ─── 28. Candidates / OpenForApply queue smoke (Task 11) ────────────────────

# Need a fresh DRAFT schedule + OPEN_FOR_APPLY shift. Reuse SCHED_CAT_ID.
banner "POST schedule (DRAFT for candidates)"
code=$(curl_post -X POST "$BASE/api/workspaces/$WORKSPACE_ID/schedules" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"name\":\"Escala Apply\",\"periodStart\":\"2027-04-01T00:00:00Z\",\"periodEnd\":\"2027-05-01T00:00:00Z\"}")
check "POST schedule for candidates (201)" "$code" "201"
APPLY_SCHED_ID=$(json '.id')

banner "POST shift (will toggle to OPEN_FOR_APPLY)"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$APPLY_SCHED_ID/shifts" \
  -d "{\"categoryId\":\"$SCHED_CAT_ID\",\"startAt\":\"2027-04-08T08:00:00Z\",\"endAt\":\"2027-04-08T17:00:00Z\",\"headcount\":1}")
check "POST shift (201)" "$code" "201"
APPLY_SHIFT_ID=$(json '.id')

# 28a — PATCH shift to OPEN_FOR_APPLY
banner "PATCH shift assignmentMode=OPEN_FOR_APPLY"
code=$(curl_post -X PATCH \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$APPLY_SCHED_ID/shifts/$APPLY_SHIFT_ID" \
  -d '{"assignmentMode":"OPEN_FOR_APPLY"}')
check "PATCH shift mode (200)" "$code" "200"

# Publish the schedule to allow apply
banner "POST publish schedule for candidates"
code=$(curl_post -X POST \
  "$BASE/api/workspaces/$WORKSPACE_ID/schedules/$APPLY_SCHED_ID/publish" \
  -d '{}')
check "POST schedule publish for candidates (200)" "$code" "200"

# 28b — Apply
banner "POST shift apply"
code=$(curl_post -X POST "$BASE/api/shifts/$APPLY_SHIFT_ID/apply" -d '{}')
check "POST apply (201)" "$code" "201"
CANDIDATE_ID=$(json '.id')

# 28c — Get count (should be 1)
banner "GET shift candidates count"
code=$(curl_get "$BASE/api/shifts/$APPLY_SHIFT_ID/candidates/count")
check "GET candidates count (200)" "$code" "200"

# 28d — Approve with autoAccept=true (creates ACCEPTED assignment + fills shift)
banner "POST candidate approve (autoAccept=true)"
code=$(curl_post -X POST \
  "$BASE/api/candidates/$CANDIDATE_ID/approve" \
  -d '{"autoAccept":true}')
check "POST approve (200)" "$code" "200"

# ─── 23. Soft-delete workspace (204) ────────────────────────────────────────

banner "DELETE /api/workspaces/:id"

code=$(curl_get -X DELETE "$BASE/api/workspaces/$WORKSPACE_ID")
check "DELETE /api/workspaces/:id (204)" "$code" "204"

# ─── 24. Soft-delete tenant (204) ───────────────────────────────────────────

banner "DELETE /api/tenants/:id"

code=$(curl_get -X DELETE "$BASE/api/tenants/$TENANT_ID")
check "DELETE /api/tenants/:id (204)" "$code" "204"

# ─── 25. Get soft-deleted tenant (403, not a member of active) ──────────────

banner "GET deleted tenant (403)"

code=$(curl_get "$BASE/api/tenants/$TENANT_ID")
check "GET deleted tenant (403/404)" "$code" "403"

# ─── Summary ────────────────────────────────────────────────────────────────

echo ""
echo "─── Summary ───"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
