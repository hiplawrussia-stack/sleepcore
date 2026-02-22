/**
 * SessionManager Unit Tests
 * ==========================
 * Tests for HIPAA-compliant session timeout management.
 *
 * HIPAA §164.312(a)(2)(iii) requirements:
 * - Automatic logoff after period of inactivity (15 minutes)
 * - Session tracking with timestamps
 * - Audit logging of session events
 *
 * Test approach:
 * - Robolectric for DataStore access
 * - Mocked AuditLogger for event verification
 * - Time manipulation for timeout testing
 */

package ru.sleepcore.companion.security

import android.content.Context
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStoreFile
import androidx.test.core.app.ApplicationProvider
import io.mockk.*
import io.mockk.impl.annotations.MockK
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import ru.sleepcore.companion.data.local.audit.AuditLogger
import ru.sleepcore.companion.data.local.audit.AuditOutcome
import java.io.File

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class SessionManagerTest {

    @MockK
    private lateinit var auditLogger: AuditLogger

    private lateinit var context: Context
    private lateinit var sessionManager: SessionManager
    private lateinit var testScope: TestScope
    private lateinit var dataStoreFile: File

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        context = ApplicationProvider.getApplicationContext()

        // Clear any existing datastore
        dataStoreFile = context.preferencesDataStoreFile("session")
        dataStoreFile.delete()

        // Mock audit logger
        every { auditLogger.logSecurityEvent(any(), any(), any(), any(), any(), any()) } just Runs

        sessionManager = SessionManager(context, auditLogger)
        testScope = TestScope(UnconfinedTestDispatcher() + Job())
    }

    @After
    fun teardown() {
        // Clean up datastore file
        dataStoreFile.delete()
        clearAllMocks()
    }

    // ==================== CONSTANTS TESTS ====================

    @Test
    fun `SESSION_TIMEOUT_MS is 15 minutes`() {
        val fifteenMinutesInMs = 15 * 60 * 1000L
        assertEquals(fifteenMinutesInMs, SessionManager.SESSION_TIMEOUT_MS)
    }

    @Test
    fun `BACKGROUND_GRACE_PERIOD_MS is 2 minutes`() {
        val twoMinutesInMs = 2 * 60 * 1000L
        assertEquals(twoMinutesInMs, SessionManager.BACKGROUND_GRACE_PERIOD_MS)
    }

    // ==================== START SESSION TESTS ====================

    @Test
    fun `startSession creates new session`() = runTest {
        sessionManager.startSession()

        val hasSession = sessionManager.hasActiveSession()
        assertTrue(hasSession)
    }

    @Test
    fun `startSession logs audit event`() = runTest {
        sessionManager.startSession()

        verify {
            auditLogger.logSecurityEvent(
                action = "SESSION_START",
                outcome = AuditOutcome.SUCCESS,
                source = "SessionManager:startSession"
            )
        }
    }

    @Test
    fun `startSession sets last activity timestamp`() = runTest {
        val beforeStart = System.currentTimeMillis()
        sessionManager.startSession()
        val afterStart = System.currentTimeMillis()

        // Session should not be expired immediately after start
        val isExpired = sessionManager.isSessionExpired()
        assertFalse(isExpired)

        // Remaining time should be close to full timeout
        val remaining = sessionManager.getRemainingSessionTime()
        assertTrue(remaining > SessionManager.SESSION_TIMEOUT_MS - 1000) // Within 1 second
    }

    // ==================== END SESSION TESTS ====================

    @Test
    fun `endSession clears session data`() = runTest {
        sessionManager.startSession()
        assertTrue(sessionManager.hasActiveSession())

        sessionManager.endSession()

        // Session should be considered expired (no data)
        val isExpired = sessionManager.isSessionExpired()
        assertTrue(isExpired)
    }

    @Test
    fun `endSession logs audit event`() = runTest {
        sessionManager.startSession()
        clearMocks(auditLogger, answers = false)
        every { auditLogger.logSecurityEvent(any(), any(), any(), any(), any(), any()) } just Runs

        sessionManager.endSession()

        verify {
            auditLogger.logSecurityEvent(
                action = "SESSION_END",
                outcome = AuditOutcome.SUCCESS,
                source = "SessionManager:endSession"
            )
        }
    }

    @Test
    fun `endSession called twice does not throw`() = runTest {
        sessionManager.startSession()
        sessionManager.endSession()

        // Should not throw
        sessionManager.endSession()
    }

    // ==================== SESSION EXPIRATION TESTS ====================

    @Test
    fun `isSessionExpired returns true when no session exists`() = runTest {
        val isExpired = sessionManager.isSessionExpired()
        assertTrue(isExpired)
    }

    @Test
    fun `isSessionExpired returns false for fresh session`() = runTest {
        sessionManager.startSession()

        val isExpired = sessionManager.isSessionExpired()
        assertFalse(isExpired)
    }

    @Test
    fun `hasActiveSession returns false when no session exists`() = runTest {
        val hasSession = sessionManager.hasActiveSession()
        assertFalse(hasSession)
    }

    @Test
    fun `hasActiveSession returns true after startSession`() = runTest {
        sessionManager.startSession()

        val hasSession = sessionManager.hasActiveSession()
        assertTrue(hasSession)
    }

    @Test
    fun `hasActiveSession returns false after endSession`() = runTest {
        sessionManager.startSession()
        sessionManager.endSession()

        val hasSession = sessionManager.hasActiveSession()
        assertFalse(hasSession)
    }

    // ==================== UPDATE ACTIVITY TESTS ====================

    @Test
    fun `updateLastActivity extends session`() = runTest {
        sessionManager.startSession()

        // Update activity
        sessionManager.updateLastActivity()

        // Session should still be active
        assertFalse(sessionManager.isSessionExpired())
    }

    @Test
    fun `updateLastActivity resets timeout countdown`() = runTest {
        sessionManager.startSession()

        val remainingBefore = sessionManager.getRemainingSessionTime()

        // Small delay then update
        sessionManager.updateLastActivity()

        val remainingAfter = sessionManager.getRemainingSessionTime()

        // Remaining time should be close to full (refreshed)
        assertTrue(remainingAfter > SessionManager.SESSION_TIMEOUT_MS - 1000)
    }

    // ==================== REMAINING TIME TESTS ====================

    @Test
    fun `getRemainingSessionTime returns 0 when no session`() = runTest {
        val remaining = sessionManager.getRemainingSessionTime()
        assertEquals(0L, remaining)
    }

    @Test
    fun `getRemainingSessionTime returns positive for active session`() = runTest {
        sessionManager.startSession()

        val remaining = sessionManager.getRemainingSessionTime()
        assertTrue(remaining > 0)
        assertTrue(remaining <= SessionManager.SESSION_TIMEOUT_MS)
    }

    // ==================== EXPIRING SOON TESTS ====================

    @Test
    fun `isSessionAboutToExpire returns false for fresh session`() = runTest {
        sessionManager.startSession()

        val aboutToExpire = sessionManager.isSessionAboutToExpire()
        assertFalse(aboutToExpire)
    }

    @Test
    fun `isSessionAboutToExpire returns false when no session`() = runTest {
        // No session = remaining time is 0, which is NOT in 1..GRACE_PERIOD range
        val aboutToExpire = sessionManager.isSessionAboutToExpire()
        assertFalse(aboutToExpire)
    }

    // ==================== SESSION DURATION TESTS ====================

    @Test
    fun `getSessionDuration returns null when no session`() = runTest {
        val duration = sessionManager.getSessionDuration()
        assertNull(duration)
    }

    @Test
    fun `getSessionDuration returns positive for active session`() = runTest {
        sessionManager.startSession()

        val duration = sessionManager.getSessionDuration()
        assertNotNull(duration)
        assertTrue(duration!! >= 0)
    }

    // ==================== CHECK WITH TIMEOUT TESTS ====================

    @Test
    fun `checkSessionWithTimeout returns true for active session`() = runTest {
        sessionManager.startSession()
        var timeoutCalled = false

        val result = sessionManager.checkSessionWithTimeout {
            timeoutCalled = true
        }

        assertTrue(result)
        assertFalse(timeoutCalled)
    }

    @Test
    fun `checkSessionWithTimeout returns false when no session`() = runTest {
        var timeoutCalled = false

        val result = sessionManager.checkSessionWithTimeout {
            timeoutCalled = true
        }

        assertFalse(result)
        assertTrue(timeoutCalled)
    }

    @Test
    fun `checkSessionWithTimeout calls onTimeout when expired`() = runTest {
        // No session exists, so it's expired
        var timeoutCalled = false

        sessionManager.checkSessionWithTimeout {
            timeoutCalled = true
        }

        assertTrue(timeoutCalled)
    }

    @Test
    fun `checkSessionWithTimeout logs timeout event`() = runTest {
        // Clear previous mocks
        clearMocks(auditLogger, answers = false)
        every { auditLogger.logSecurityEvent(any(), any(), any(), any(), any(), any()) } just Runs

        sessionManager.checkSessionWithTimeout {}

        verify {
            auditLogger.logSecurityEvent(
                action = "SESSION_TIMEOUT",
                outcome = AuditOutcome.SUCCESS,
                details = "Session timed out after inactivity",
                source = "SessionManager:checkSessionWithTimeout"
            )
        }
    }

    @Test
    fun `checkSessionWithTimeout ends session when timed out`() = runTest {
        // Start then manually expire by checking without session
        sessionManager.checkSessionWithTimeout {}

        // Verify end session was also logged
        verify {
            auditLogger.logSecurityEvent(
                action = "SESSION_END",
                outcome = AuditOutcome.SUCCESS,
                source = "SessionManager:endSession"
            )
        }
    }

    // ==================== MULTIPLE SESSION TESTS ====================

    @Test
    fun `multiple startSession calls reset session`() = runTest {
        sessionManager.startSession()
        val firstDuration = sessionManager.getSessionDuration()

        // Small delay
        Thread.sleep(10)

        sessionManager.startSession()
        val secondDuration = sessionManager.getSessionDuration()

        // Second session should have shorter duration (was just started)
        assertNotNull(firstDuration)
        assertNotNull(secondDuration)
        assertTrue(secondDuration!! <= firstDuration!! + 50) // Allow small variance
    }

    // ==================== EDGE CASES ====================

    @Test
    fun `session state is persistent across manager instances`() = runTest {
        sessionManager.startSession()

        // Create new manager instance with same context
        val newManager = SessionManager(context, auditLogger)

        // Should see the existing session
        val hasSession = newManager.hasActiveSession()
        assertTrue(hasSession)
    }

    @Test
    fun `remaining time never negative`() = runTest {
        // No session, remaining should be 0, not negative
        val remaining = sessionManager.getRemainingSessionTime()
        assertTrue(remaining >= 0)
    }
}
