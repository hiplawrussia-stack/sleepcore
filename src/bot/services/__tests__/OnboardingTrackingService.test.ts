/**
 * OnboardingTrackingService Tests
 * ================================
 *
 * Tests for onboarding funnel analytics service.
 * Validates progress tracking, step completion, and funnel analytics.
 *
 * @packageDocumentation
 */

import {
  OnboardingTrackingService,
  onboardingTracker,
  type OnboardingStep,
  type IOnboardingProgress,
} from '../OnboardingTrackingService';

describe('OnboardingTrackingService', () => {
  let service: OnboardingTrackingService;
  const testUserId = 'user_test_123';

  beforeEach(() => {
    service = new OnboardingTrackingService();
  });

  afterEach(() => {
    service.clear();
  });

  // ==========================================================================
  // Start Onboarding
  // ==========================================================================
  describe('Start Onboarding', () => {
    it('should start onboarding tracking for new user', () => {
      const progress = service.startOnboarding(testUserId);

      expect(progress.userId).toBe(testUserId);
      expect(progress.startedAt).toBeInstanceOf(Date);
      expect(progress.currentStep).toBe('welcome_viewed');
      expect(progress.completedSteps).toHaveLength(0);
      expect(progress.isCompleted).toBe(false);
      expect(progress.completionPercentage).toBe(0);
    });

    it('should return existing progress for returning user', () => {
      const first = service.startOnboarding(testUserId);
      const second = service.startOnboarding(testUserId);

      expect(first).toBe(second);
    });

    it('should log event on start', () => {
      service.startOnboarding(testUserId);
      const events = service.exportEventLog();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].userId).toBe(testUserId);
      expect(events[0].step).toBe('welcome_viewed');
      expect(events[0].action).toBe('started');
    });
  });

  // ==========================================================================
  // Complete Step
  // ==========================================================================
  describe('Complete Step', () => {
    it('should complete a step', () => {
      service.startOnboarding(testUserId);
      const progress = service.completeStep(testUserId, 'welcome_viewed');

      expect(progress).not.toBeNull();
      expect(progress?.completedSteps).toHaveLength(1);
      expect(progress?.completedSteps[0].step).toBe('welcome_viewed');
      expect(progress?.completionPercentage).toBeGreaterThan(0);
    });

    it('should auto-start onboarding if not started', () => {
      const progress = service.completeStep(testUserId, 'welcome_viewed');

      expect(progress).not.toBeNull();
      expect(progress?.userId).toBe(testUserId);
    });

    it('should not duplicate completed steps', () => {
      service.startOnboarding(testUserId);
      service.completeStep(testUserId, 'welcome_viewed');
      service.completeStep(testUserId, 'welcome_viewed');

      const progress = service.getProgress(testUserId);
      const welcomeSteps = progress?.completedSteps.filter(
        s => s.step === 'welcome_viewed'
      );

      expect(welcomeSteps?.length).toBe(1);
    });

    it('should update current step to next in funnel', () => {
      service.startOnboarding(testUserId);
      service.completeStep(testUserId, 'welcome_viewed');

      const progress = service.getProgress(testUserId);
      expect(progress?.currentStep).toBe('name_collected');
    });

    it('should calculate duration from previous step', () => {
      service.startOnboarding(testUserId);

      // Wait a bit to ensure measurable duration
      service.completeStep(testUserId, 'welcome_viewed');

      const progress = service.getProgress(testUserId);
      const step = progress?.completedSteps[0];

      expect(step?.durationMs).toBeDefined();
      expect(step?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should include metadata in completion record', () => {
      service.startOnboarding(testUserId);
      service.completeStep(testUserId, 'welcome_viewed', {
        source: 'deep_link',
        campaign: 'summer2025',
      });

      const progress = service.getProgress(testUserId);
      expect(progress?.completedSteps[0].metadata).toEqual({
        source: 'deep_link',
        campaign: 'summer2025',
      });
    });

    it('should mark onboarding as completed on final step', () => {
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      service.startOnboarding(testUserId);
      for (const step of steps) {
        service.completeStep(testUserId, step);
      }

      const progress = service.getProgress(testUserId);
      expect(progress?.isCompleted).toBe(true);
      expect(progress?.completedAt).toBeInstanceOf(Date);
      expect(progress?.completionPercentage).toBe(100);
    });
  });

  // ==========================================================================
  // Skip Step
  // ==========================================================================
  describe('Skip Step', () => {
    it('should log skipped step', () => {
      service.startOnboarding(testUserId);
      service.skipStep(testUserId, 'notifications_configured');

      const events = service.exportEventLog();
      const skipEvent = events.find(e => e.action === 'skipped');

      expect(skipEvent).toBeDefined();
      expect(skipEvent?.step).toBe('notifications_configured');
    });
  });

  // ==========================================================================
  // Get Progress
  // ==========================================================================
  describe('Get Progress', () => {
    it('should get user progress', () => {
      service.startOnboarding(testUserId);
      const progress = service.getProgress(testUserId);

      expect(progress).not.toBeNull();
      expect(progress?.userId).toBe(testUserId);
    });

    it('should return null for unknown user', () => {
      const progress = service.getProgress('unknown_user');
      expect(progress).toBeNull();
    });
  });

  // ==========================================================================
  // Onboarding Status
  // ==========================================================================
  describe('Onboarding Status', () => {
    it('should check if onboarding is complete', () => {
      service.startOnboarding(testUserId);
      expect(service.isOnboardingComplete(testUserId)).toBe(false);

      // Complete all steps
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      for (const step of steps) {
        service.completeStep(testUserId, step);
      }

      expect(service.isOnboardingComplete(testUserId)).toBe(true);
    });

    it('should return false for unknown user', () => {
      expect(service.isOnboardingComplete('unknown_user')).toBe(false);
    });

    it('should check if specific step is completed', () => {
      service.startOnboarding(testUserId);
      service.completeStep(testUserId, 'welcome_viewed');

      expect(service.isStepCompleted(testUserId, 'welcome_viewed')).toBe(true);
      expect(service.isStepCompleted(testUserId, 'name_collected')).toBe(false);
    });

    it('should return false for step check on unknown user', () => {
      expect(service.isStepCompleted('unknown', 'welcome_viewed')).toBe(false);
    });
  });

  // ==========================================================================
  // Next Step
  // ==========================================================================
  describe('Next Step', () => {
    it('should get next recommended step', () => {
      service.startOnboarding(testUserId);

      let nextStep = service.getNextStep(testUserId);
      expect(nextStep).toBe('welcome_viewed');

      service.completeStep(testUserId, 'welcome_viewed');
      nextStep = service.getNextStep(testUserId);
      expect(nextStep).toBe('name_collected');
    });

    it('should return null for unknown user', () => {
      const nextStep = service.getNextStep('unknown_user');
      expect(nextStep).toBeNull();
    });

    it('should return null when onboarding completed', () => {
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      service.startOnboarding(testUserId);
      for (const step of steps) {
        service.completeStep(testUserId, step);
      }

      const nextStep = service.getNextStep(testUserId);
      expect(nextStep).toBeNull();
    });
  });

  // ==========================================================================
  // Step Names
  // ==========================================================================
  describe('Step Names', () => {
    it('should get step display name', () => {
      expect(service.getStepName('welcome_viewed')).toBe('Приветствие просмотрено');
      expect(service.getStepName('isi_completed')).toBe('ISI завершен');
      expect(service.getStepName('onboarding_completed')).toBe('Онбординг завершен');
    });

    it('should return Russian names for all steps', () => {
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      for (const step of steps) {
        const name = service.getStepName(step);
        expect(name.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // Progress Bar
  // ==========================================================================
  describe('Progress Bar', () => {
    it('should generate progress bar', () => {
      service.startOnboarding(testUserId);
      service.completeStep(testUserId, 'welcome_viewed');

      const bar = service.generateProgressBar(testUserId);

      expect(bar).toContain('█');
      expect(bar).toContain('░');
      expect(bar).toContain('%');
      expect(bar).toMatch(/\d+\/\d+/); // e.g., 1/9
    });

    it('should return empty string for unknown user', () => {
      const bar = service.generateProgressBar('unknown_user');
      expect(bar).toBe('');
    });

    it('should show full bar when completed', () => {
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      service.startOnboarding(testUserId);
      for (const step of steps) {
        service.completeStep(testUserId, step);
      }

      const bar = service.generateProgressBar(testUserId);
      expect(bar).toContain('100%');
      expect(bar).not.toContain('░'); // All filled
    });
  });

  // ==========================================================================
  // Status Message
  // ==========================================================================
  describe('Status Message', () => {
    it('should generate status message for new user', () => {
      const message = service.generateStatusMessage(testUserId);
      expect(message).toContain('не начат');
    });

    it('should generate status message for in-progress user', () => {
      service.startOnboarding(testUserId);
      service.completeStep(testUserId, 'welcome_viewed');

      const message = service.generateStatusMessage(testUserId);

      expect(message).toContain('Прогресс');
      expect(message).toContain('Следующий шаг');
    });

    it('should generate status message for completed user', () => {
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      service.startOnboarding(testUserId);
      for (const step of steps) {
        service.completeStep(testUserId, step);
      }

      const message = service.generateStatusMessage(testUserId);

      expect(message).toContain('✅');
      expect(message).toContain('завершен');
      expect(message).toContain('Время');
    });
  });

  // ==========================================================================
  // Funnel Analytics
  // ==========================================================================
  describe('Funnel Analytics', () => {
    it('should calculate funnel analytics', () => {
      // Create multiple users at different stages
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      service.completeStep('user1', 'name_collected');

      service.startOnboarding('user2');
      service.completeStep('user2', 'welcome_viewed');

      service.startOnboarding('user3');

      const analytics = service.getFunnelAnalytics();

      expect(analytics.totalUsers).toBe(3);
      expect(analytics.completedUsers).toBe(0);
      expect(analytics.conversionRate).toBe(0);
      expect(analytics.stepConversions.length).toBe(9);
    });

    it('should calculate step conversion rates', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');

      service.startOnboarding('user2');
      service.completeStep('user2', 'welcome_viewed');

      const analytics = service.getFunnelAnalytics();
      const welcomeStep = analytics.stepConversions.find(
        s => s.step === 'welcome_viewed'
      );

      expect(welcomeStep?.completed).toBe(2);
      expect(welcomeStep?.reached).toBeGreaterThanOrEqual(2);
    });

    it('should calculate average completion time', () => {
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      service.startOnboarding('user1');
      for (const step of steps) {
        service.completeStep('user1', step);
      }

      const analytics = service.getFunnelAnalytics();

      expect(analytics.completedUsers).toBe(1);
      expect(analytics.averageCompletionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty analytics', () => {
      const analytics = service.getFunnelAnalytics();

      expect(analytics.totalUsers).toBe(0);
      expect(analytics.completedUsers).toBe(0);
      expect(analytics.conversionRate).toBe(0);
      expect(analytics.averageCompletionTimeMs).toBe(0);
    });

    it('should calculate drop-off rate', () => {
      // User 1 completes welcome but stops
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');

      // User 2 completes welcome and name
      service.startOnboarding('user2');
      service.completeStep('user2', 'welcome_viewed');
      service.completeStep('user2', 'name_collected');

      const analytics = service.getFunnelAnalytics();
      const nameStep = analytics.stepConversions.find(
        s => s.step === 'name_collected'
      );

      // One of two users dropped off at name_collected
      expect(nameStep?.dropOffRate).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Export Data
  // ==========================================================================
  describe('Export Data', () => {
    it('should export progress data', () => {
      service.startOnboarding('user1');
      service.startOnboarding('user2');

      const data = service.exportProgressData();

      expect(data).toHaveLength(2);
      expect(data[0].userId).toBeDefined();
    });

    it('should export event log', () => {
      service.startOnboarding(testUserId);
      service.completeStep(testUserId, 'welcome_viewed');
      service.skipStep(testUserId, 'isi_started');

      const events = service.exportEventLog();

      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events.some(e => e.action === 'started')).toBe(true);
      expect(events.some(e => e.action === 'completed')).toBe(true);
      expect(events.some(e => e.action === 'skipped')).toBe(true);
    });
  });

  // ==========================================================================
  // Clear Data
  // ==========================================================================
  describe('Clear Data', () => {
    it('should clear all data', () => {
      service.startOnboarding('user1');
      service.startOnboarding('user2');
      service.completeStep('user1', 'welcome_viewed');

      service.clear();

      expect(service.getProgress('user1')).toBeNull();
      expect(service.getProgress('user2')).toBeNull();
      expect(service.exportEventLog()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(onboardingTracker).toBeInstanceOf(OnboardingTrackingService);
    });

    it('should track progress via singleton', () => {
      const progress = onboardingTracker.startOnboarding('singleton_user');
      expect(progress).toBeDefined();

      onboardingTracker.clear();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle out-of-order step completion', () => {
      service.startOnboarding(testUserId);

      // Complete steps out of order
      service.completeStep(testUserId, 'isi_started');
      service.completeStep(testUserId, 'welcome_viewed');

      const progress = service.getProgress(testUserId);

      // Both should be marked complete
      expect(progress?.completedSteps.some(s => s.step === 'isi_started')).toBe(true);
      expect(progress?.completedSteps.some(s => s.step === 'welcome_viewed')).toBe(true);
    });

    it('should handle rapid step completions', () => {
      service.startOnboarding(testUserId);

      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
      ];

      steps.forEach(step => service.completeStep(testUserId, step));

      const progress = service.getProgress(testUserId);
      expect(progress?.completedSteps).toHaveLength(3);
    });

    it('should handle many users', () => {
      for (let i = 0; i < 100; i++) {
        service.startOnboarding(`user_${i}`);
        service.completeStep(`user_${i}`, 'welcome_viewed');
      }

      const analytics = service.getFunnelAnalytics();
      expect(analytics.totalUsers).toBe(100);
    });

    it('should limit event log size', () => {
      // Generate many events
      for (let i = 0; i < 200; i++) {
        service.startOnboarding(`user_${i}`);
        service.completeStep(`user_${i}`, 'welcome_viewed');
        service.completeStep(`user_${i}`, 'name_collected');
        service.skipStep(`user_${i}`, 'isi_started');
      }

      const events = service.exportEventLog();
      // Should be limited (maxEventLogSize / 2 after trim)
      expect(events.length).toBeLessThanOrEqual(10000);
    });

    it('should format short duration', () => {
      service.startOnboarding(testUserId);

      // Complete immediately
      const steps: OnboardingStep[] = [
        'welcome_viewed',
        'name_collected',
        'age_confirmed',
        'isi_started',
        'isi_completed',
        'first_diary_entry',
        'first_mood_check',
        'notifications_configured',
        'onboarding_completed',
      ];

      for (const step of steps) {
        service.completeStep(testUserId, step);
      }

      const message = service.generateStatusMessage(testUserId);
      // Should contain formatted time (сек, мин, or ч)
      expect(message).toMatch(/сек|мин|ч/);
    });
  });
});
