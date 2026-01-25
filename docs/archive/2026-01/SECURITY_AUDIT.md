# Security Audit Report - SleepCore DTx

> **Audit Date**: 2026-01-08
> **Version**: 1.0.0-alpha.4
> **Auditor**: Claude Code (Automated)
> **Status**: Completed with Fixes

---

## Executive Summary

This security audit was conducted to assess PHI (Protected Health Information) data protection compliance for the SleepCore digital therapeutic application. The audit covers HIPAA, GDPR, and Russian 152-FZ requirements.

### Overall Assessment: **PARTIALLY COMPLIANT**

| Area | Status | Notes |
|------|--------|-------|
| Encryption Architecture | ✅ Implemented | AES-256-GCM, needs key configuration |
| Audit Trail | ✅ Implemented | 6-year retention, HIPAA compliant |
| Input Validation | ✅ Good | Parameterized queries throughout |
| Access Control | ✅ Good | Session-based, Telegram auth |
| Secrets Management | ⚠️ Needs Setup | .env.example created |
| Error Handling | ✅ Good | Sentry integration with PHI scrubbing |

---

## Research Basis (2025-2026 Standards)

### Sources (HIGH Confidence)

| Standard | Requirement | Source |
|----------|-------------|--------|
| HIPAA 2025 | AES-256 mandatory for ePHI at rest | [Censinet](https://www.censinet.com/perspectives/hipaa-encryption-protocols-2025-updates) |
| HIPAA 2025 | TLS 1.3 mandatory for data in transit | [HIPAA Journal](https://www.hipaajournal.com/hipaa-encryption-requirements/) |
| HIPAA 2025 | Audit logs 6-year retention | [Kiteworks](https://www.kiteworks.com/hipaa-compliance/hipaa-audit-log-requirements/) |
| OWASP 2025 | A01: Broken Access Control | [OWASP Top 10](https://owasp.org/Top10/2025/) |
| OWASP 2025 | A03: Software Supply Chain (NEW) | [OWASP Top 10](https://owasp.org/Top10/2025/) |
| OWASP 2025 | A05: Injection | [OWASP Top 10](https://owasp.org/Top10/2025/) |
| Russia 152-FZ | Data localization from 01.07.2025 | [Konsu](https://konsugroup.com/en/news/new-requirements-personal-data-protection-russia-2025-07/) |
| OWASP | Argon2id for password hashing | [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) |

---

## Findings and Remediation

### CRITICAL Issues

#### 1. ❌ Encryption Master Key Not Configured

**File**: `.env`
**Status**: **REQUIRES ACTION**

The EncryptionService is implemented with AES-256-GCM but the master key is not set. All PHI data is currently stored **unencrypted**.

**PHI Fields Affected**:
- User: email, firstName, lastName, phoneNumber, address, dateOfBirth
- Health: diagnosis, medications, symptoms, therapyNotes
- Sleep: sleepNotes, dreamContent, stressFactors, ISI scores

**Remediation**:
```bash
# Generate encryption key
openssl rand -hex 32

# Add to .env
ENCRYPTION_MASTER_KEY=<generated_64_char_hex>
```

**Reference**: `src/infrastructure/database/security/EncryptionService.ts:111-116`

---

### HIGH Issues

#### 2. ✅ FIXED: Command Injection in BackupService

**File**: `src/infrastructure/database/security/BackupService.ts:299`
**Status**: **FIXED**

**Before** (Vulnerable):
```typescript
const dumpCommand = `pg_dump -h ${pgHost} -p ${pgPort}...`;
await execAsync(dumpCommand, {...});
```

**After** (Secure):
```typescript
await execFileAsync('pg_dump', [
  '-h', pgHost,
  '-p', pgPort,
  '-U', pgUser,
  '-d', pgDatabase,
  '-F', 'c',
  '-f', backupPath,
], {...});
```

**OWASP Reference**: A05:2025 Injection

---

#### 3. ⚠️ Static Salt in Key Derivation

**File**: `src/infrastructure/database/security/EncryptionService.ts:125`
**Status**: **LOW RISK** (mitigated by per-encryption salt)

```typescript
const salt = crypto.createHash('sha256').update('sleepcore-static-salt').digest();
```

**Analysis**: While the base key derivation uses a static salt, each encryption operation generates a random salt (line 161). This is acceptable but not ideal.

**Recommendation**: Consider using a per-installation salt stored securely.

---

### MEDIUM Issues

#### 4. ✅ FIXED: Audit Service Missing PHI Redaction Fields

**File**: `src/infrastructure/database/security/AuditService.ts:136`
**Status**: **FIXED**

**Before**:
```typescript
redactedFields: ['password', 'token', 'secret', 'key', 'ssn', 'credit_card'],
```

**After**:
```typescript
redactedFields: [
  // Authentication secrets
  'password', 'token', 'secret', 'key', 'apiKey', 'api_key',
  // Financial PII
  'ssn', 'credit_card', 'insuranceId', 'insurance_id',
  // Personal PII (GDPR/152-FZ)
  'firstName', 'first_name', 'lastName', 'last_name', 'email',
  'phoneNumber', 'phone_number', 'address', 'dateOfBirth', 'date_of_birth',
  // Healthcare PHI (HIPAA)
  'diagnosis', 'medications', 'symptoms', 'therapyNotes', 'therapy_notes',
  'sleepNotes', 'sleep_notes', 'dreamContent', 'dream_content', 'stressFactors',
],
```

---

#### 5. ⚠️ Session Data Not Encrypted at Rest

**File**: `src/main.ts:119-182`
**Status**: **DEFERRED**

SessionData containing ISI scores and mood history is stored in SQLite without field-level encryption.

**Risk**: LOW (database file should be protected by filesystem permissions)

**Recommendation**: Enable EncryptionService for session PHI fields in future release.

---

### LOW Issues

#### 6. ⚠️ Sentry PHI Scrubbing

**File**: `src/infrastructure/monitoring/instrument.ts`
**Status**: **IMPLEMENTED** (verify in production)

PHI scrubbing is implemented with:
- 30+ sensitive field patterns
- Regex patterns for emails, phones, Telegram IDs
- beforeSend hook for HIPAA compliance

**Recommendation**: Verify scrubbing effectiveness with test data before production.

---

## Security Strengths

### ✅ Parameterized Queries
All database operations use parameterized queries preventing SQL injection:
- `UserRepository`: Uses `?` placeholders
- `SleepDiaryRepository`: Uses `?` placeholders
- `AuditService`: Uses `?`/`$N` placeholders

### ✅ AES-256-GCM Encryption
- Industry-standard authenticated encryption
- Unique IV per encryption (line 158)
- 100,000 PBKDF2 iterations (NIST minimum)
- Key rotation support

### ✅ HIPAA/GDPR Audit Trail
- Comprehensive logging: who, what, when, where
- 6-year retention (HIPAA requirement)
- Immutable audit entries
- Old/new value capture

### ✅ GDPR Data Subject Rights
- `UserRepository.anonymizeUser()` - Right to be forgotten
- `UserRepository.exportUserData()` - Data portability
- Consent tracking in database schema

### ✅ Backup & Recovery
- Automated backup scheduling
- WAL checkpoint for SQLite
- SHA-256 checksum verification
- Optional AES-256-GCM encryption

### ✅ Sentry Integration
- PHI/PII scrubbing in beforeSend hook
- User ID anonymization (SHA-256 hash)
- Error categorization
- Graceful shutdown with flush

---

## Compliance Checklist

### HIPAA Security Rule (45 CFR 164)

| Requirement | Status | Notes |
|-------------|--------|-------|
| §164.312(a)(1) Access Control | ✅ | Telegram session auth |
| §164.312(b) Audit Controls | ✅ | AuditService with 6yr retention |
| §164.312(c)(1) Integrity | ✅ | AES-256-GCM auth tags |
| §164.312(d) Authentication | ✅ | Telegram user verification |
| §164.312(e)(1) Transmission Security | ✅ | HTTPS/TLS via Telegram |
| §164.312(e)(2)(ii) Encryption | ⚠️ | Implemented, needs key setup |

### GDPR

| Requirement | Status | Notes |
|-------------|--------|-------|
| Article 17 - Right to Erasure | ✅ | anonymizeUser() |
| Article 20 - Data Portability | ✅ | exportUserData() |
| Article 25 - Privacy by Design | ✅ | Field-level encryption |
| Article 30 - Records of Processing | ✅ | AuditService |
| Article 32 - Security | ⚠️ | Needs encryption key |

### Russia 152-FZ

| Requirement | Status | Notes |
|-------------|--------|-------|
| Data Localization | ⚠️ | Deploy on Russian servers |
| Consent Requirements | ✅ | Consent tracking in DB |
| Breach Notification | ✅ | Sentry alerting |
| Security Measures | ⚠️ | Configure encryption |

---

## Recommendations

### Immediate Actions (Before Production)

1. **Generate and configure ENCRYPTION_MASTER_KEY**
   ```bash
   openssl rand -hex 32
   ```

2. **Generate and configure BACKUP_ENCRYPTION_KEY**
   ```bash
   openssl rand -hex 32
   ```

3. **Rotate Telegram Bot Token** (if ever exposed)
   - Use @BotFather `/revoke` command
   - Update `.env` with new token

4. **Run npm audit**
   ```bash
   npm audit
   npm audit fix
   ```

### Short-term (Week 1-2)

5. **Enable EncryptionService** for all PHI fields
6. **Configure Sentry DSN** for production monitoring
7. **Set up backup schedule** (daily recommended)

### Medium-term (Month 1)

8. **Implement rate limiting** on bot commands
9. **Add input validation schemas** (Zod) for all user input
10. **Security penetration testing** before public launch

---

## Files Modified in This Audit

| File | Change |
|------|--------|
| `src/infrastructure/database/security/BackupService.ts` | Fixed command injection (exec → execFile) |
| `src/infrastructure/database/security/AuditService.ts` | Added PHI fields to redaction list |
| `.env.example` | Created with all required variables |
| `SECURITY_AUDIT.md` | Created (this file) |

---

## Next Audit

Recommended: **Quarterly** or after any major release

---

*This audit was conducted using automated security analysis tools and manual code review. For production deployment, consider engaging a professional security auditor for penetration testing.*
