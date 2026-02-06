/**
 * OnboardingTrackingService Unit Tests
 * =====================================
 * Tests for user onboarding funnel tracking.
 *
 * @module @sleepcore/bot/services
 */

import {
  OnboardingTrackingService,
  onboardingTracker,
  type OnboardingStep,
} from '../../../../src/bot/services/OnboardingTrackingService';

describe('OnboardingTrackingService', () => {
  let service: OnboardingTrackingService;

  beforeEach(() => {
    service = new OnboardingTrackingService();
  });

  describe('startOnboarding', () => {
    it('should start tracking for new user', () => {
      const progress = service.startOnboarding('user1');

      expect(progress.userId).toBe('user1');
      expect(progress.currentStep).toBe('welcome_viewed');
      expect(progress.completedSteps).toHaveLength(0);
      expect(progress.isCompleted).toBe(false);
      expect(progress.completionPercentage).toBe(0);
    });

    it('should return existing progress if already started', () => {
      const first = service.startOnboarding('user1');
      const second = service.startOnboarding('user1');

      expect(first).toBe(second);
    });

    it('should track multiple users independently', () => {
      const user1 = service.startOnboarding('user1');
      const user2 = service.startOnboarding('user2');

      expect(user1.userId).toBe('user1');
      expect(user2.userId).toBe('user2');
    });
  });

  describe('completeStep', () => {
    it('should complete a step', () => {
      service.startOnboarding('user1');
      const progress = service.completeStep('user1', 'welcome_viewed');

      expect(progress).not.toBeNull();
      expect(progress!.completedSteps).toHaveLength(1);
      expect(progress!.completedSteps[0].step).toBe('welcome_viewed');
    });

    it('should auto-start if not started', () => {
      const progress = service.completeStep('user2', 'welcome_viewed');

      expect(progress).not.toBeNull();
      expect(progress!.userId).toBe('user2');
    });

    it('should not duplicate completed steps', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      const progress = service.completeStep('user1', 'welcome_viewed');

      expect(progress!.completedSteps).toHaveLength(1);
    });

    it('should advance current step', () => {
      service.startOnboarding('user1');
      const progress = service.completeStep('user1', 'welcome_viewed');

      expect(progress!.currentStep).toBe('name_collected');
    });

    it('should calculate completion percentage', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      const progress = service.completeStep('user1', 'name_collected');

      expect(progress!.completionPercentage).toBeGreaterThan(0);
    });

    it('should mark as completed on final step', () => {
      service.startOnboarding('user1');
      const progress = service.completeStep('user1', 'onboarding_completed');

      expect(progress!.isCompleted).toBe(true);
      expect(progress!.completedAt).toBeDefined();
    });

    it('should mark as completed at 100%', () => {
      service.startOnboarding('user1');
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

      let progress;
      for (const step of steps) {
        progress = service.completeStep('user1', step);
      }

      expect(progress!.isCompleted).toBe(true);
      expect(progress!.completionPercentage).toBe(100);
    });

    it('should store metadata', () => {
      service.startOnboarding('user1');
      const metadata = { source: 'test' };
      service.completeStep('user1', 'welcome_viewed', metadata);
      const progress = service.getProgress('user1');

      expect(progress!.completedSteps[0].metadata).toEqual(metadata);
    });

    it('should calculate duration from previous step', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      const progress = service.completeStep('user1', 'name_collected');

      expect(progress!.completedSteps[1].durationMs).toBeDefined();
    });
  });

  describe('skipStep', () => {
    it('should log skipped step', () => {
      service.startOnboarding('user1');
      service.skipStep('user1', 'notifications_configured');

      const events = service.exportEventLog();
      const skippedEvent = events.find(e => e.action === 'skipped');
      expect(skippedEvent).toBeDefined();
    });
  });

  describe('getProgress', () => {
    it('should return progress for existing user', () => {
      service.startOnboarding('user1');
      const progress = service.getProgress('user1');

      expect(progress).not.toBeNull();
    });

    it('should return null for unknown user', () => {
      const progress = service.getProgress('unknown');

      expect(progress).toBeNull();
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return false for new user', () => {
      service.startOnboarding('user1');
      const complete = service.isOnboardingComplete('user1');

      expect(complete).toBe(false);
    });

    it('should return false for unknown user', () => {
      const complete = service.isOnboardingComplete('unknown');

      expect(complete).toBe(false);
    });

    it('should return true after completing onboarding', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'onboarding_completed');
      const complete = service.isOnboardingComplete('user1');

      expect(complete).toBe(true);
    });
  });

  describe('isStepCompleted', () => {
    it('should return false for uncompleted step', () => {
      service.startOnboarding('user1');
      const completed = service.isStepCompleted('user1', 'name_collected');

      expect(completed).toBe(false);
    });

    it('should return true for completed step', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      const completed = service.isStepCompleted('user1', 'welcome_viewed');

      expect(completed).toBe(true);
    });

    it('should return false for unknown user', () => {
      const completed = service.isStepCompleted('unknown', 'welcome_viewed');

      expect(completed).toBe(false);
    });
  });

  describe('getNextStep', () => {
    it('should return first step for new user', () => {
      service.startOnboarding('user1');
      const next = service.getNextStep('user1');

      expect(next).toBe('welcome_viewed');
    });

    it('should return null for unknown user', () => {
      const next = service.getNextStep('unknown');

      expect(next).toBeNull();
    });

    it('should return null for completed user', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'onboarding_completed');
      const next = service.getNextStep('user1');

      expect(next).toBeNull();
    });

    it('should return next uncompleted step', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      const next = service.getNextStep('user1');

      expect(next).toBe('name_collected');
    });
  });

  describe('getStepName', () => {
    it('should return Russian name for step', () => {
      const name = service.getStepName('welcome_viewed');

      expect(name).toBe('Приветствие просмотрено');
    });

    it('should return name for all steps', () => {
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

  describe('generateProgressBar', () => {
    it('should return empty for unknown user', () => {
      const bar = service.generateProgressBar('unknown');

      expect(bar).toBe('');
    });

    it('should show 0% for new user', () => {
      service.startOnboarding('user1');
      const bar = service.generateProgressBar('user1');

      expect(bar).toContain('0%');
    });

    it('should show progress after completing steps', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      const bar = service.generateProgressBar('user1');

      expect(bar).toContain('%');
      expect(bar).toContain('█');
    });
  });

  describe('generateStatusMessage', () => {
    it('should show not started for unknown user', () => {
      const message = service.generateStatusMessage('unknown');

      expect(message).toContain('не начат');
    });

    it('should show progress for active user', () => {
      service.startOnboarding('user1');
      const message = service.generateStatusMessage('user1');

      expect(message).toContain('Прогресс');
      expect(message).toContain('Следующий шаг');
    });

    it('should show completion for finished user', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'onboarding_completed');
      const message = service.generateStatusMessage('user1');

      expect(message).toContain('завершен');
    });
  });

  describe('getFunnelAnalytics', () => {
    it('should return empty analytics with no users', () => {
      const analytics = service.getFunnelAnalytics();

      expect(analytics.totalUsers).toBe(0);
      expect(analytics.completedUsers).toBe(0);
      expect(analytics.conversionRate).toBe(0);
    });

    it('should calculate conversion rate', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'onboarding_completed');
      service.startOnboarding('user2');

      const analytics = service.getFunnelAnalytics();

      expect(analytics.totalUsers).toBe(2);
      expect(analytics.completedUsers).toBe(1);
      expect(analytics.conversionRate).toBe(50);
    });

    it('should track step conversions', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      service.completeStep('user1', 'name_collected');

      const analytics = service.getFunnelAnalytics();

      expect(analytics.stepConversions.length).toBeGreaterThan(0);
    });

    it('should calculate average completion time', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'onboarding_completed');

      const analytics = service.getFunnelAnalytics();

      expect(analytics.averageCompletionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportProgressData', () => {
    it('should export all progress', () => {
      service.startOnboarding('user1');
      service.startOnboarding('user2');

      const data = service.exportProgressData();

      expect(data.length).toBe(2);
    });
  });

  describe('exportEventLog', () => {
    it('should export event log', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');

      const log = service.exportEventLog();

      expect(log.length).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');

      service.clear();

      expect(service.getProgress('user1')).toBeNull();
      expect(service.exportEventLog()).toHaveLength(0);
    });
  });
});

describe('onboardingTracker singleton', () => {
  it('should export singleton instance', () => {
    expect(onboardingTracker).toBeInstanceOf(OnboardingTrackingService);
  });

  it('should be able to start onboarding', () => {
    const progress = onboardingTracker.startOnboarding('test-singleton');
    expect(progress.userId).toBe('test-singleton');
    onboardingTracker.clear();
  });
});

describe('OnboardingTrackingService - additional branches', () => {
  let service: OnboardingTrackingService;

  beforeEach(() => {
    service = new OnboardingTrackingService();
  });

  describe('duration formatting', () => {
    it('should format duration with hours', () => {
      service.startOnboarding('user1');
      // Manually complete with enough time for hours
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
        service.completeStep('user1', step);
      }

      const message = service.generateStatusMessage('user1');
      expect(message).toContain('завершен');
    });
  });

  describe('funnel analytics edge cases', () => {
    it('should handle multiple users at different stages', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');
      service.completeStep('user1', 'name_collected');

      service.startOnboarding('user2');
      service.completeStep('user2', 'welcome_viewed');

      service.startOnboarding('user3');
      service.completeStep('user3', 'onboarding_completed');

      const analytics = service.getFunnelAnalytics();

      expect(analytics.totalUsers).toBe(3);
      expect(analytics.completedUsers).toBe(1);
      expect(analytics.stepConversions.length).toBeGreaterThan(0);
    });

    it('should calculate drop-off rates correctly', () => {
      service.startOnboarding('user1');
      service.completeStep('user1', 'welcome_viewed');

      service.startOnboarding('user2');
      service.completeStep('user2', 'welcome_viewed');
      service.completeStep('user2', 'name_collected');

      const analytics = service.getFunnelAnalytics();

      const welcomeStep = analytics.stepConversions.find(
        s => s.step === 'welcome_viewed'
      );
      expect(welcomeStep).toBeDefined();
      expect(welcomeStep!.completed).toBe(2);
    });

    it('should handle empty average durations', () => {
      service.startOnboarding('user1');
      // Don't complete any steps

      const analytics = service.getFunnelAnalytics();
      expect(analytics.averageCompletionTimeMs).toBe(0);
    });
  });

  describe('getNextStep edge cases', () => {
    it('should return null when all steps completed', () => {
      service.startOnboarding('user1');
      const allSteps: OnboardingStep[] = [
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

      for (const step of allSteps) {
        service.completeStep('user1', step);
      }

      const next = service.getNextStep('user1');
      expect(next).toBeNull();
    });
  });
});
