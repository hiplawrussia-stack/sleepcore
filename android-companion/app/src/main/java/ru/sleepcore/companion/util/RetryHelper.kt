/**
 * Retry Helper with Exponential Backoff
 * ======================================
 * Implements retry logic with exponential backoff and jitter.
 *
 * Based on research (February 2026):
 * - Exponential backoff: delay * 2^attempt
 * - Jitter: prevents thundering herd problem
 * - Max retries: typically 3-5 for mobile
 *
 * Sources:
 * - developer.android.com/topic/libraries/architecture/workmanager
 * - aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.util

import kotlinx.coroutines.delay
import kotlin.math.min
import kotlin.math.pow
import kotlin.random.Random

/**
 * Configuration for retry behavior
 */
data class RetryConfig(
    val maxAttempts: Int = 3,
    val initialDelayMs: Long = 1000L,
    val maxDelayMs: Long = 30000L,
    val multiplier: Double = 2.0,
    val jitterFactor: Double = 0.1  // ±10% jitter
)

/**
 * Result of a retry operation
 */
sealed class RetryResult<out T> {
    data class Success<T>(val value: T, val attempts: Int) : RetryResult<T>()
    data class Failure(
        val exception: Throwable,
        val attempts: Int
    ) : RetryResult<Nothing>()
}

/**
 * Retry helper for network and other fallible operations
 */
object RetryHelper {

    /**
     * Default retry config for network operations
     */
    val NETWORK_CONFIG = RetryConfig(
        maxAttempts = 3,
        initialDelayMs = 1000L,
        maxDelayMs = 15000L,
        multiplier = 2.0,
        jitterFactor = 0.2
    )

    /**
     * Aggressive retry config for critical operations
     */
    val CRITICAL_CONFIG = RetryConfig(
        maxAttempts = 5,
        initialDelayMs = 500L,
        maxDelayMs = 30000L,
        multiplier = 2.0,
        jitterFactor = 0.15
    )

    /**
     * Execute operation with exponential backoff retry
     *
     * @param config Retry configuration
     * @param shouldRetry Predicate to determine if exception is retryable
     * @param onRetry Callback for each retry attempt (for logging)
     * @param operation The suspending operation to retry
     * @return RetryResult with success value or failure info
     */
    suspend fun <T> withRetry(
        config: RetryConfig = NETWORK_CONFIG,
        shouldRetry: (Throwable) -> Boolean = { isRetryableException(it) },
        onRetry: (attempt: Int, delayMs: Long, error: Throwable) -> Unit = { _, _, _ -> },
        operation: suspend () -> T
    ): RetryResult<T> {
        var lastException: Throwable? = null

        repeat(config.maxAttempts) { attempt ->
            try {
                val result = operation()
                return RetryResult.Success(result, attempt + 1)
            } catch (e: Throwable) {
                lastException = e

                // Check if we should retry this exception
                if (!shouldRetry(e)) {
                    return RetryResult.Failure(e, attempt + 1)
                }

                // Don't delay after last attempt
                if (attempt < config.maxAttempts - 1) {
                    val delayMs = calculateDelay(attempt, config)
                    onRetry(attempt + 1, delayMs, e)
                    delay(delayMs)
                }
            }
        }

        return RetryResult.Failure(
            lastException ?: IllegalStateException("Retry exhausted with no exception"),
            config.maxAttempts
        )
    }

    /**
     * Execute operation with retry, returning Result<T>
     *
     * Convenience wrapper for operations that return Result
     */
    suspend fun <T> withRetryResult(
        config: RetryConfig = NETWORK_CONFIG,
        shouldRetry: (Throwable) -> Boolean = { isRetryableException(it) },
        onRetry: (attempt: Int, delayMs: Long, error: Throwable) -> Unit = { _, _, _ -> },
        operation: suspend () -> Result<T>
    ): Result<T> {
        var lastException: Throwable? = null

        repeat(config.maxAttempts) { attempt ->
            val result = operation()

            if (result.isSuccess) {
                return result
            }

            val error = result.exceptionOrNull()
            lastException = error

            // Check if we should retry this exception
            if (error != null && !shouldRetry(error)) {
                return result
            }

            // Don't delay after last attempt
            if (attempt < config.maxAttempts - 1 && error != null) {
                val delayMs = calculateDelay(attempt, config)
                onRetry(attempt + 1, delayMs, error)
                delay(delayMs)
            }
        }

        return Result.failure(
            lastException ?: IllegalStateException("Retry exhausted with no exception")
        )
    }

    /**
     * Calculate delay with exponential backoff and jitter
     *
     * Formula: min(maxDelay, initialDelay * multiplier^attempt) * (1 ± jitter)
     */
    fun calculateDelay(attempt: Int, config: RetryConfig): Long {
        // Exponential delay
        val exponentialDelay = config.initialDelayMs * config.multiplier.pow(attempt.toDouble())

        // Cap at max delay
        val cappedDelay = min(exponentialDelay, config.maxDelayMs.toDouble())

        // Add jitter (±jitterFactor)
        val jitterRange = cappedDelay * config.jitterFactor
        val jitter = if (jitterRange > 0) {
            Random.nextDouble(-jitterRange, jitterRange)
        } else {
            0.0
        }

        return (cappedDelay + jitter).toLong().coerceAtLeast(0)
    }

    /**
     * Determine if an exception is retryable
     *
     * Network errors and timeouts are retryable.
     * Auth errors (401) and client errors (4xx) are NOT retryable.
     */
    fun isRetryableException(throwable: Throwable): Boolean {
        return when {
            // Network connectivity issues
            throwable is java.net.UnknownHostException -> true
            throwable is java.net.SocketTimeoutException -> true
            throwable is java.net.ConnectException -> true
            throwable is java.io.IOException -> true
            throwable is javax.net.ssl.SSLException -> true

            // Retrofit/OkHttp specific
            throwable.message?.contains("timeout", ignoreCase = true) == true -> true
            throwable.message?.contains("network", ignoreCase = true) == true -> true

            // Non-retryable errors (business logic errors)
            throwable.message?.contains("TOKEN_EXPIRED") == true -> false
            throwable.message?.contains("NOT_LINKED") == true -> false
            throwable.message?.contains("INVALID_CODE") == true -> false
            throwable.message?.contains("NO_NEW_DATA") == true -> false

            // Default: don't retry unknown errors
            else -> false
        }
    }
}
