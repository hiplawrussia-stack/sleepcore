/**
 * AuditLogger Unit Tests
 * =======================
 * Tests for HIPAA-compliant audit logging.
 *
 * HIPAA §164.312(b)(1) requirements:
 * - All security events logged
 * - Automatic timestamps (UTC)
 * - Integrity hash computation
 * - Non-blocking writes
 *
 * Test approach:
 * - Robolectric for Android context
 * - Mocked DAO for verification
 * - Async verification for coroutine logging
 */

package ru.sleepcore.companion.data.local.audit

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import io.mockk.*
import io.mockk.impl.annotations.MockK
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class AuditLoggerTest {

    @MockK
    private lateinit var auditLogDao: AuditLogDao

    private lateinit var context: Context
    private lateinit var auditLogger: AuditLogger

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        context = ApplicationProvider.getApplicationContext()

        // Default mock behavior
        coEvery { auditLogDao.insert(any()) } returns 1L
        coEvery { auditLogDao.getRecent(any()) } returns emptyList()
        coEvery { auditLogDao.getSecurityEvents(any()) } returns emptyList()
        coEvery { auditLogDao.getByTimeRange(any(), any()) } returns emptyList()
        coEvery { auditLogDao.getCount() } returns 0
        coEvery { auditLogDao.getCountByOutcome(any()) } returns 0
        coEvery { auditLogDao.getOldestTimestamp() } returns null

        auditLogger = AuditLogger(context, auditLogDao)
    }

    @After
    fun teardown() {
        clearAllMocks()
    }

    // ==================== AUTHENTICATION LOGGING TESTS ====================

    @Test
    fun `logAuthentication logs with correct category`() = runTest {
        auditLogger.logAuthentication(
            action = "LOGIN",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.category == AuditCategory.AUTHENTICATION &&
                it.action == "LOGIN" &&
                it.outcome == AuditOutcome.SUCCESS
            })
        }
    }

    @Test
    fun `logAuthentication sets resource to credentials`() = runTest {
        auditLogger.logAuthentication(
            action = "TOKEN_REFRESH",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.resource == "credentials" })
        }
    }

    @Test
    fun `logAuthentication includes userId when provided`() = runTest {
        auditLogger.logAuthentication(
            action = "LOGIN",
            outcome = AuditOutcome.SUCCESS,
            userId = "user-123"
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.userId == "user-123" })
        }
    }

    @Test
    fun `logAuthentication includes error message on failure`() = runTest {
        auditLogger.logAuthentication(
            action = "LOGIN",
            outcome = AuditOutcome.FAILURE,
            errorMessage = "Invalid credentials"
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.outcome == AuditOutcome.FAILURE &&
                it.errorMessage == "Invalid credentials"
            })
        }
    }

    // ==================== DATA ACCESS LOGGING TESTS ====================

    @Test
    fun `logDataAccess logs with correct category`() = runTest {
        auditLogger.logDataAccess(
            action = "READ_SESSIONS",
            resource = "sleep_sessions",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.category == AuditCategory.DATA_ACCESS &&
                it.action == "READ_SESSIONS" &&
                it.resource == "sleep_sessions"
            })
        }
    }

    @Test
    fun `logDataAccess includes details`() = runTest {
        auditLogger.logDataAccess(
            action = "READ_SESSIONS",
            resource = "sleep_sessions",
            outcome = AuditOutcome.SUCCESS,
            details = "Read 5 sessions"
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.details == "Read 5 sessions" })
        }
    }

    // ==================== DATA MODIFICATION LOGGING TESTS ====================

    @Test
    fun `logDataModification logs with correct category`() = runTest {
        auditLogger.logDataModification(
            action = "CREATE_SESSION",
            resource = "sleep_sessions",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.category == AuditCategory.DATA_MODIFICATION &&
                it.action == "CREATE_SESSION"
            })
        }
    }

    // ==================== DATA SYNC LOGGING TESTS ====================

    @Test
    fun `logDataSync logs with correct category and resource`() = runTest {
        auditLogger.logDataSync(
            action = "SYNC_UPLOAD",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.category == AuditCategory.DATA_SYNC &&
                it.resource == "sleep_sessions"
            })
        }
    }

    @Test
    fun `logDataSync logs sync failures`() = runTest {
        auditLogger.logDataSync(
            action = "SYNC_UPLOAD",
            outcome = AuditOutcome.ERROR,
            errorMessage = "Network timeout"
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.outcome == AuditOutcome.ERROR &&
                it.errorMessage == "Network timeout"
            })
        }
    }

    // ==================== SECURITY EVENT LOGGING TESTS ====================

    @Test
    fun `logSecurityEvent logs with correct category`() = runTest {
        auditLogger.logSecurityEvent(
            action = "SESSION_TIMEOUT",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.category == AuditCategory.SECURITY_EVENT &&
                it.action == "SESSION_TIMEOUT"
            })
        }
    }

    @Test
    fun `logSecurityEvent includes source`() = runTest {
        auditLogger.logSecurityEvent(
            action = "SESSION_START",
            outcome = AuditOutcome.SUCCESS,
            source = "SessionManager:startSession"
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.source == "SessionManager:startSession" })
        }
    }

    // ==================== SYSTEM EVENT LOGGING TESTS ====================

    @Test
    fun `logSystemEvent logs with correct category`() = runTest {
        auditLogger.logSystemEvent(
            action = "APP_START",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.category == AuditCategory.SYSTEM_EVENT &&
                it.action == "APP_START"
            })
        }
    }

    @Test
    fun `logSystemEvent handles errors`() = runTest {
        auditLogger.logSystemEvent(
            action = "APP_CRASH",
            outcome = AuditOutcome.ERROR,
            errorMessage = "NullPointerException",
            source = "MainActivity:onCreate"
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.action == "APP_CRASH" &&
                it.outcome == AuditOutcome.ERROR &&
                it.errorMessage == "NullPointerException"
            })
        }
    }

    // ==================== CURRENT USER TESTS ====================

    @Test
    fun `setCurrentUser sets user for subsequent logs`() = runTest {
        auditLogger.setCurrentUser("user-456")

        auditLogger.logAuthentication(
            action = "SESSION_REFRESH",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.userId == "user-456" })
        }
    }

    @Test
    fun `setCurrentUser with null clears user`() = runTest {
        auditLogger.setCurrentUser("user-123")
        auditLogger.setCurrentUser(null)

        auditLogger.logSystemEvent(
            action = "TEST",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.userId == null })
        }
    }

    @Test
    fun `explicit userId overrides currentUser`() = runTest {
        auditLogger.setCurrentUser("user-default")

        auditLogger.logAuthentication(
            action = "LOGIN",
            outcome = AuditOutcome.SUCCESS,
            userId = "user-explicit"
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.userId == "user-explicit" })
        }
    }

    // ==================== INTEGRITY HASH TESTS ====================

    @Test
    fun `logs include integrity hash`() = runTest {
        auditLogger.logAuthentication(
            action = "LOGIN",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.integrityHash.isNotEmpty() &&
                it.integrityHash.length == 64 // SHA-256 hex
            })
        }
    }

    @Test
    fun `integrity hash is unique per event`() = runTest {
        val capturedHashes = mutableListOf<String>()
        coEvery { auditLogDao.insert(any()) } coAnswers {
            val entity = firstArg<AuditLogEntity>()
            capturedHashes.add(entity.integrityHash)
            capturedHashes.size.toLong()
        }

        auditLogger.logAuthentication(action = "LOGIN", outcome = AuditOutcome.SUCCESS)
        auditLogger.logAuthentication(action = "LOGOUT", outcome = AuditOutcome.SUCCESS)

        // Wait for IO dispatcher coroutines to complete (2s for CI runners)
        Thread.sleep(2000)

        assertEquals(2, capturedHashes.size)
        assertNotEquals(capturedHashes[0], capturedHashes[1])
    }

    // ==================== TIMESTAMP TESTS ====================

    @Test
    fun `logs include UTC timestamp`() = runTest {
        auditLogger.logSystemEvent(
            action = "TEST",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match {
                it.timestamp.isNotEmpty() &&
                it.timestamp.endsWith("Z") // UTC indicator
            })
        }
    }

    // ==================== DEVICE ID TESTS ====================

    @Test
    fun `logs include device ID`() = runTest {
        auditLogger.logSystemEvent(
            action = "TEST",
            outcome = AuditOutcome.SUCCESS
        )

        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify {
            auditLogDao.insert(match { it.deviceId.isNotEmpty() })
        }
    }

    // ==================== ERROR RESILIENCE TESTS ====================

    @Test
    fun `logging continues after DAO failure`() = runTest {
        // First call fails
        coEvery { auditLogDao.insert(any()) } throws RuntimeException("DB error") andThen 1L

        // Should not throw
        auditLogger.logSystemEvent(action = "TEST1", outcome = AuditOutcome.SUCCESS)
        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        // Should still work
        auditLogger.logSystemEvent(action = "TEST2", outcome = AuditOutcome.SUCCESS)
        // AuditLogger uses Dispatchers.IO, not test dispatcher
        Thread.sleep(100)

        coVerify(exactly = 2) { auditLogDao.insert(any()) }
    }

    // ==================== QUERY TESTS ====================

    @Test
    fun `getRecentLogs returns logs from dao`() = runTest {
        val expectedLogs = listOf(
            createTestEntity("action1"),
            createTestEntity("action2")
        )
        coEvery { auditLogDao.getRecent(50) } returns expectedLogs

        val result = auditLogger.getRecentLogs(50)

        assertEquals(2, result.size)
        coVerify { auditLogDao.getRecent(50) }
    }

    @Test
    fun `getRecentLogs default limit is 50`() = runTest {
        coEvery { auditLogDao.getRecent(50) } returns emptyList()

        auditLogger.getRecentLogs()

        coVerify { auditLogDao.getRecent(50) }
    }

    @Test
    fun `getSecurityEvents returns events from dao`() = runTest {
        val expectedEvents = listOf(createTestEntity("SECURITY_EVENT"))
        coEvery { auditLogDao.getSecurityEvents(100) } returns expectedEvents

        val result = auditLogger.getSecurityEvents()

        assertEquals(1, result.size)
        coVerify { auditLogDao.getSecurityEvents(100) }
    }

    @Test
    fun `exportLogs returns logs in time range`() = runTest {
        val startTime = "2026-02-01T00:00:00Z"
        val endTime = "2026-02-28T23:59:59Z"
        val expectedLogs = listOf(createTestEntity("action1"))
        coEvery { auditLogDao.getByTimeRange(startTime, endTime) } returns expectedLogs

        val result = auditLogger.exportLogs(startTime, endTime)

        assertEquals(1, result.size)
        coVerify { auditLogDao.getByTimeRange(startTime, endTime) }
    }

    // ==================== STATISTICS TESTS ====================

    @Test
    fun `getStatistics returns correct data`() = runTest {
        coEvery { auditLogDao.getCount() } returns 100
        coEvery { auditLogDao.getCountByOutcome(AuditOutcome.FAILURE) } returns 5
        coEvery { auditLogDao.getCountByOutcome(AuditOutcome.ERROR) } returns 3
        coEvery { auditLogDao.getOldestTimestamp() } returns "2026-01-01T00:00:00Z"

        val stats = auditLogger.getStatistics()

        assertEquals(100, stats.totalLogs)
        assertEquals(5, stats.failureCount)
        assertEquals(3, stats.errorCount)
        assertEquals("2026-01-01T00:00:00Z", stats.oldestLogTimestamp)
    }

    @Test
    fun `getStatistics handles no logs`() = runTest {
        coEvery { auditLogDao.getCount() } returns 0
        coEvery { auditLogDao.getCountByOutcome(any()) } returns 0
        coEvery { auditLogDao.getOldestTimestamp() } returns null

        val stats = auditLogger.getStatistics()

        assertEquals(0, stats.totalLogs)
        assertEquals(0, stats.failureCount)
        assertEquals(0, stats.errorCount)
        assertNull(stats.oldestLogTimestamp)
    }

    // ==================== HELPER ====================

    private fun createTestEntity(action: String) = AuditLogEntity(
        id = 0L,
        timestamp = "2026-02-22T12:00:00Z",
        category = AuditCategory.SYSTEM_EVENT,
        action = action,
        resource = null,
        userId = null,
        deviceId = "test-device",
        outcome = AuditOutcome.SUCCESS,
        details = null,
        errorMessage = null,
        source = null,
        integrityHash = "test-hash"
    )
}

/**
 * AuditStatistics Unit Tests
 */
class AuditStatisticsTest {

    @Test
    fun `statistics data class preserves values`() {
        val stats = AuditStatistics(
            totalLogs = 100,
            failureCount = 10,
            errorCount = 5,
            oldestLogTimestamp = "2026-01-01T00:00:00Z"
        )

        assertEquals(100, stats.totalLogs)
        assertEquals(10, stats.failureCount)
        assertEquals(5, stats.errorCount)
        assertEquals("2026-01-01T00:00:00Z", stats.oldestLogTimestamp)
    }

    @Test
    fun `statistics handles null timestamp`() {
        val stats = AuditStatistics(
            totalLogs = 0,
            failureCount = 0,
            errorCount = 0,
            oldestLogTimestamp = null
        )

        assertNull(stats.oldestLogTimestamp)
    }

    @Test
    fun `statistics equality works`() {
        val stats1 = AuditStatistics(100, 10, 5, "2026-01-01T00:00:00Z")
        val stats2 = AuditStatistics(100, 10, 5, "2026-01-01T00:00:00Z")

        assertEquals(stats1, stats2)
        assertEquals(stats1.hashCode(), stats2.hashCode())
    }
}
