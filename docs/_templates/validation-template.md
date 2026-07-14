# Validation: <Feature Name>

**Date**: YYYY-MM-DD
**Status**: Pending Implementation | In Progress | Complete

---

## Acceptance Criteria

| ID | Criterion | Verification Method | Result |
|----|-----------|---------------------|--------|
| AC1 | Description | Manual test / Code review | ⬜ |
| AC2 | Description | Manual test | ⬜ |

---

## QA Checklist (per sub-step)

### Step N: <description>

| Test | Expected | Result |
|------|----------|--------|
| POST /api/... valid body | 201 + { ... } | ⬜ |
| POST /api/... no auth | 401 | ⬜ |
| POST /api/... invalid body | 400 + details | ⬜ |

<!-- Repeat per sub-step -->

---

## Quality Gates

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm lint` | ⬜ | |
| `pnpm build` | ⬜ | |
| Browser console errors | ⬜ | |

---

## Files Modified

```
_To be filled after implementation_
```

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer (Claude) | Claude | | ⬜ |
| Reviewer (Human) | | | ⬜ |
