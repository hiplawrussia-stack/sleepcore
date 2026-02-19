/**
 * RetryHelper Unit Tests
 * =======================
 * Tests for exponential backoff retry logic.
 */

package ru.sleepcore.companion.util

import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import java.net.SocketTimeoutException
import java.net.UnknownHostException

class RetryHelperTest {

    // ========== calculateDelay Tests ==========

    @Test
    fun `calculateDelay returns initialDelay for first attempt`() {
        val config = RetryConfig(
            initialDelayMs = 1000L,
            multiplier = 2.0,
            jitterFactor = 0.0  // No jitter for deterministic test
        )

        val delay = RetryHelper.calculateDelay(0, config)

        assertEquals(1000L, delay)
    }

    @Test
    fun `calculateDelay doubles for each attempt`() {
        val config = RetryConfig(
            initialDelayMs = 1000L,
            multiplier = 2.0,
            jitterFactor = 0.0,
            maxDelayMs = 100000L
        )

        val delay0 = RetryHelper.calculateDelay(0, config)
        val delay1 = RetryHelper.calculateDelay(1, config)
        val delay2 = RetryHelper.calculateDelay(2, config)
        val delay3 = RetryHelper.calculateDelay(3, config)

        assertEquals(1000L, delay0)  // 1000 * 2^0 = 1000
        assertEquals(2000L, delay1)  // 1000 * 2^1 = 2000
        assertEquals(4000L, delay2)  // 1000 * 2^2 = 4000
        assertEquals(8000L, delay3)  // 1000 * 2^3 = 8000
    }

    @Test
    fun `calculateDelay caps at maxDelayMs`() {
        val config = RetryConfig(
            initialDelayMs = 1000L,
            multiplier = 2.0,
            jitterFactor = 0.0,
            maxDelayMs = 5000L
        )

        val delay5 = RetryHelper.calculateDelay(5, config)  // Would be 32000 without cap

        assertEquals(5000L, delay5)
    }

    @Test
    fun `calculateDelay adds jitter within range`() {
        val config = RetryConfig(
            initialDelayMs = 1000L,
            multiplier = 2.0,
            jitterFactor = 0.2,  // ±20%
            maxDelayMs = 100000L
        )

        // Run multiple times to check jitter variance
        val delays = (0..99).map { RetryHelper.calculateDelay(0, config) }

        // All delays should be within ±20% of 1000
        assertTrue(delays.all { it in 800L..1200L })

        // Not all delays should be identical (jitter should add variance)
        val uniqueDelays = delays.toSet()
        assertTrue(uniqueDelays.size > 1)
    }

    // ========== isRetryableException Tests ==========

    @Test
    fun `isRetryableException returns true for UnknownHostException`() {
        val exception = UnknownHostException("No internet")

        assertTrue(RetryHelper.isRetryableException(exception))
    }

    @Test
    fun `isRetryableException returns true for SocketTimeoutException`() {
        val exception = SocketTimeoutException("Timeout")

        assertTrue(RetryHelper.isRetryableException(exception))
    }

    @Test
    fun `isRetryableException returns false for TOKEN_EXPIRED`() {
        val exception = Exception("TOKEN_EXPIRED")

        assertFalse(RetryHelper.isRetryableException(exception))
    }

    @Test
    fun `isRetryableException returns false for NOT_LINKED`() {
        val exception = Exception("NOT_LINKED")

        assertFalse(RetryHelper.isRetryableException(exception))
    }

    @Test
    fun `isRetryableException returns false for NO_NEW_DATA`() {
        val exception = Exception("NO_NEW_DATA")

        assertFalse(RetryHelper.isRetryableException(exception))
    }

    @Test
    fun `isRetryableException returns false for unknown errors`() {
        val exception = Exception("Some random error")

        assertFalse(RetryHelper.isRetryableException(exception))
    }

    // ========== withRetry Tests ==========

    @Test
    fun `withRetry returns Success on first attempt when operation succeeds`() = runTest {
        var attempts = 0

        val result = RetryHelper.withRetry {
            attempts++
            "success"
        }

        assertTrue(result is RetryResult.Success)
        assertEquals("success", (result as RetryResult.Success).value)
        assertEquals(1, result.attempts)
        assertEquals(1, attempts)
    }

    @Test
    fun `withRetry retries on retryable exception`() = runTest {
        var attempts = 0
        val config = RetryConfig(maxAttempts = 3, initialDelayMs = 1L)

        val result = RetryHelper.withRetry(config) {
            attempts++
            if (attempts < 3) {
                throw SocketTimeoutException("Timeout")
            }
            "success"
        }

        assertTrue(result is RetryResult.Success)
        assertEquals(3, attempts)
    }

    @Test
    fun `withRetry fails immediately on non-retryable exception`() = runTest {
        var attempts = 0
        val config = RetryConfig(maxAttempts = 3, initialDelayMs = 1L)

        val result = RetryHelper.withRetry(config) {
            attempts++
            throw Exception("TOKEN_EXPIRED")
        }

        assertTrue(result is RetryResult.Failure)
        assertEquals(1, attempts)  // Only one attempt
    }

    @Test
    fun `withRetry returns Failure after max attempts exhausted`() = runTest {
        var attempts = 0
        val config = RetryConfig(maxAttempts = 3, initialDelayMs = 1L)

        val result = RetryHelper.withRetry(config) {
            attempts++
            throw SocketTimeoutException("Always timeout")
        }

        assertTrue(result is RetryResult.Failure)
        assertEquals(3, (result as RetryResult.Failure).attempts)
        assertEquals(3, attempts)
    }

    @Test
    fun `withRetry calls onRetry callback for each retry`() = runTest {
        var attempts = 0
        val retryLogs = mutableListOf<Int>()
        val config = RetryConfig(maxAttempts = 3, initialDelayMs = 1L)

        RetryHelper.withRetry(
            config = config,
            onRetry = { attempt, _, _ -> retryLogs.add(attempt) }
        ) {
            attempts++
            if (attempts < 3) {
                throw SocketTimeoutException("Timeout")
            }
            "success"
        }

        // Should have logged retries 1 and 2 (not 3 since it succeeded)
        assertEquals(listOf(1, 2), retryLogs)
    }

    // ========== withRetryResult Tests ==========

    @Test
    fun `withRetryResult returns success Result when operation succeeds`() = runTest {
        var attempts = 0
        val config = RetryConfig(maxAttempts = 3, initialDelayMs = 1L)

        val result = RetryHelper.withRetryResult(config) {
            attempts++
            Result.success("value")
        }

        assertTrue(result.isSuccess)
        assertEquals("value", result.getOrNull())
        assertEquals(1, attempts)
    }

    @Test
    fun `withRetryResult retries on failure Result with retryable error`() = runTest {
        var attempts = 0
        val config = RetryConfig(maxAttempts = 3, initialDelayMs = 1L)

        val result = RetryHelper.withRetryResult(config) {
            attempts++
            if (attempts < 3) {
                Result.failure(SocketTimeoutException("Timeout"))
            } else {
                Result.success("success")
            }
        }

        assertTrue(result.isSuccess)
        assertEquals(3, attempts)
    }

    // ========== Configuration Tests ==========

    @Test
    fun `NETWORK_CONFIG has reasonable defaults`() {
        val config = RetryHelper.NETWORK_CONFIG

        assertEquals(3, config.maxAttempts)
        assertEquals(1000L, config.initialDelayMs)
        assertEquals(15000L, config.maxDelayMs)
        assertEquals(2.0, config.multiplier, 0.01)
    }

    @Test
    fun `CRITICAL_CONFIG has more attempts`() {
        val config = RetryHelper.CRITICAL_CONFIG

        assertEquals(5, config.maxAttempts)
    }
}
