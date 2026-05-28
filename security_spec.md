# Firebase Security Specification & Red Team Audit Plan

This specification outlines the data safety invariants and adversarial attack payloads used to verify that our security filters block all unauthenticated or malicious bypasses.

## 1. Core Data Invariants

1. **User Ownership (Identity Lock)**: A user's profile, settings, daily briefs, and task entries are strictly private. No user can read, create, update, or list documents belonging to any other user.
2. **Strict Document Structure (Anti-Shadow Fields)**: All creation payloads are checked for exact property names and length bounds. Adding unauthorized properties triggers a reject.
3. **Temporal Integrity**: Fields like `createdAt` must match `request.time` exactly. Fields like `originalOwnerId` cannot be updated post-creation.
4. **ID Poisoning Guard**: Document ID path variables (userId, taskId, briefId) must be valid alphanumeric formats with strict length limits (<= 128 characters) to prevent Denial of Wallet or storage bloat.

## 2. The "Dirty Dozen" Vulnerability Payloads

This suite of simulated exploits aims to bypass constraints in a weak database configuration:

### Attack 1: Identity Spoofing (Save Task as Sibling)
- **Target**: `tasks/task-abc`
- **Payload**: `{ "id": "task-abc", "userId": "victim-user-uid", "date": "2026-05-22", "title": "Bypass!", "status": "pending", "priority": "high" }`
- **Expected Outcome**: `PERMISSION_DENIED` (UID in payload doesn't match active Auth UID).

### Attack 2: Shadow Field Injection (Settings)
- **Target**: `settings/attacker-uid`
- **Payload**: `{ "id": "attacker-uid", "userId": "attacker-uid", "topics": ["AI"], "location": "Berlin", "isPremiumMember": true }`
- **Expected Outcome**: `PERMISSION_DENIED` (Shadow variable `isPremiumMember` violates strict key validation).

### Attack 3: PII Leak via Blanket List Query
- **Target**: `users/`
- **Payload**: Query matching any active user (listing profiles without filter)
- **Expected Outcome**: `PERMISSION_DENIED` (Client must request single self profile explicitly).

### Attack 4: Immutable Field Modification (User Created Stamp)
- **Target**: `users/attacker-uid` (Update)
- **Payload**: `{ "createdAt": "1999-01-01" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Cannot overwrite read-only timestamp fields).

### Attack 5: Document ID Poisoning (Resource Exhaustion)
- **Target**: `tasks/` with a 10,000-character junk string ID.
- **Payload**: `{ "title": "Poison ID" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Failed `isValidId` check).

### Attack 6: Bypass Status State (Skip Pending Validation)
- **Target**: `tasks/task-xyz`
- **Payload**: `{ "status": "nonsense_state" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Enum type constraints violated).

### Attack 7: Write of Non-existent Refs (Daily Brief Sibling-Check)
- **Target**: `dailyBriefs/brief-123`
- **Payload**: `{ "userId": "non-existent-user", "date": "2026-05-22", "text": "Spoof", "summaryBullets": [] }`
- **Expected Outcome**: `PERMISSION_DENIED` (User reference does not exist / invalid auth context).

### Attack 8: Unauthenticated Write Attempt
- **Target**: `tasks/task-999` (No Auth headers)
- **Payload**: `{ "title": "Anonymous Hack" }`
- **Expected Outcome**: `PERMISSION_DENIED` (auth == null).

### Attack 9: Temporal Spoofing (Setting Custom Create Time)
- **Target**: `users/attacker-uid`
- **Payload**: `{ "id": "attacker-uid", "email": "evil@attacker.com", "createdAt": "2020-05-22T00:00:00Z" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Must bind to `request.time`).

### Attack 10: State Overwriting without Token Check
- **Target**: `settings/victim-uid`
- **Payload**: Attempting to set user settings for another target UID.
- **Expected Outcome**: `PERMISSION_DENIED`.

### Attack 11: Task Boundary Overflow (Excessive Title Size)
- **Target**: `tasks/task-large`
- **Payload**: `{ "title": "A".repeat(5000) }`
- **Expected Outcome**: `PERMISSION_DENIED` (Title size limit exceeded).

### Attack 12: Invalid Enum Range (Priority Setting Out of Bounds)
- **Target**: `tasks/task-priority`
- **Payload**: `{ "priority": "extreme!!!" }`
- **Expected Outcome**: `PERMISSION_DENIED` (Failed Priority Enum validation check).
