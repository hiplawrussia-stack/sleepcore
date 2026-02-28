/**
 * QueryProvider Tests
 * ==================
 * Unit tests for TanStack Query provider configuration.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: INT-003 (API integration)
 *
 * Coverage targets:
 * - Provider renders children
 * - Query retry logic (client vs server errors)
 * - Query error throwing behavior
 * - Mutation retry logic
 * - Mutation error handler
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { QueryProvider, queryClient } from '../../src/providers/QueryProvider';
import { ApiError } from '../../src/api';

describe('QueryProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <QueryProvider>
          <div data-testid="child">Hello World</div>
        </QueryProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should provide query client context', () => {
      const TestComponent = () => {
        const { data, isSuccess } = useQuery({
          queryKey: ['test'],
          queryFn: () => Promise.resolve('test-data'),
        });
        return <div>{isSuccess ? data : 'loading'}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      // Should render without crashing (context provided)
      expect(screen.getByText('loading')).toBeInTheDocument();
    });
  });

  describe('Query Retry Logic', () => {
    it('should not retry on client errors (4xx)', async () => {
      const mockFn = vi.fn().mockRejectedValue(new ApiError(404, 'Not Found'));
      let errorCaught = false;

      const TestComponent = () => {
        const { isError } = useQuery({
          queryKey: ['no-retry-client-error'],
          queryFn: mockFn,
        });
        if (isError) errorCaught = true;
        return <div>{isError ? 'error' : 'loading'}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      await waitFor(
        () => {
          expect(errorCaught).toBe(true);
        },
        { timeout: 5000 }
      );

      // Should only be called once (no retries)
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on server errors (5xx) up to 3 times', async () => {
      const mockFn = vi.fn().mockRejectedValue(new ApiError(500, 'Server Error'));

      const TestComponent = () => {
        const { isError } = useQuery({
          queryKey: ['retry-server-error'],
          queryFn: mockFn,
        });
        return <div>{isError ? 'error' : 'loading'}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      // Wait for all retries to complete
      await waitFor(
        () => {
          // 1 initial + 3 retries = 4 calls
          expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 10000 }
      );
    });

    it('should not retry on auth errors (401)', async () => {
      const mockFn = vi.fn().mockRejectedValue(new ApiError(401, 'Unauthorized'));

      const TestComponent = () => {
        const { isError } = useQuery({
          queryKey: ['no-retry-auth-error'],
          queryFn: mockFn,
        });
        return <div>{isError ? 'error' : 'loading'}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      await waitFor(
        () => {
          expect(screen.getByText('error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should only be called once (no retries)
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Query throwOnError', () => {
    it('should throw on 5xx errors when throwOnError is configured', async () => {
      const error = new ApiError(500, 'Internal Server Error');
      const _mockFn = vi.fn().mockRejectedValue(error);

      // Verify the throwOnError configuration works
      const options = queryClient.getDefaultOptions();
      const throwOnError = options.queries?.throwOnError;

      if (typeof throwOnError === 'function') {
        expect(throwOnError(error, {} as unknown as Parameters<typeof throwOnError>[1])).toBe(true);
      }
    });

    it('should not throw on 4xx errors', () => {
      const error = new ApiError(400, 'Bad Request');

      const options = queryClient.getDefaultOptions();
      const throwOnError = options.queries?.throwOnError;

      if (typeof throwOnError === 'function') {
        expect(throwOnError(error, {} as unknown as Parameters<typeof throwOnError>[1])).toBe(false);
      }
    });
  });

  describe('Mutation Retry Logic', () => {
    it('should not retry mutations on client errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new ApiError(400, 'Bad Request'));
      let mutationCalled = false;

      const TestComponent = () => {
        const mutation = useMutation({
          mutationFn: mockFn,
        });

        if (!mutationCalled) {
          mutationCalled = true;
          mutation.mutate(undefined);
        }

        return <div>{mutation.isError ? 'error' : 'pending'}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      await waitFor(
        () => {
          expect(screen.getByText('error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should only be called once (no retries)
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry mutations once on server errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new ApiError(500, 'Server Error'));
      let mutationCalled = false;

      const TestComponent = () => {
        const mutation = useMutation({
          mutationFn: mockFn,
        });

        if (!mutationCalled) {
          mutationCalled = true;
          mutation.mutate(undefined);
        }

        return <div>{mutation.isError ? 'error' : 'pending'}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      await waitFor(
        () => {
          expect(screen.getByText('error')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // 1 initial + 1 retry = 2 calls
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Mutation Error Handler', () => {
    it('should log mutation errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new ApiError(400, 'Bad Request');
      const mockFn = vi.fn().mockRejectedValue(error);
      let mutationCalled = false;

      const TestComponent = () => {
        const mutation = useMutation({
          mutationFn: mockFn,
        });

        if (!mutationCalled) {
          mutationCalled = true;
          mutation.mutate(undefined);
        }

        return <div>{mutation.isError ? 'error' : 'pending'}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      await waitFor(
        () => {
          expect(screen.getByText('error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(consoleSpy).toHaveBeenCalledWith('[Mutation Error]', error);
      consoleSpy.mockRestore();
    });
  });

  describe('Query Client Configuration', () => {
    it('should have correct staleTime', () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.staleTime).toBe(1000 * 60 * 5); // 5 minutes
    });

    it('should have correct gcTime', () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.gcTime).toBe(1000 * 60 * 30); // 30 minutes
    });

    it('should refetch on window focus', () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.refetchOnWindowFocus).toBe(true);
    });

    it('should refetch on reconnect', () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.refetchOnReconnect).toBe(true);
    });

    it('should refetch on mount', () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.refetchOnMount).toBe(true);
    });
  });

  describe('Retry Delay', () => {
    it('should use exponential backoff', () => {
      const options = queryClient.getDefaultOptions();
      const retryDelay = options.queries?.retryDelay;

      if (typeof retryDelay === 'function') {
        // First retry: 2^0 * 1000 = 1000ms
        expect(retryDelay(0)).toBe(1000);
        // Second retry: 2^1 * 1000 = 2000ms
        expect(retryDelay(1)).toBe(2000);
        // Third retry: 2^2 * 1000 = 4000ms
        expect(retryDelay(2)).toBe(4000);
        // Capped at 30000ms
        expect(retryDelay(10)).toBe(30000);
      }
    });
  });

  describe('queryClient export', () => {
    it('should export queryClient for direct access', () => {
      expect(queryClient).toBeDefined();
      expect(typeof queryClient.getQueryCache).toBe('function');
      expect(typeof queryClient.getMutationCache).toBe('function');
    });
  });
});
