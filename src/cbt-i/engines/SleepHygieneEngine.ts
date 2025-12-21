/**
 * SleepHygieneEngine - Sleep Hygiene Education Implementation
 * ============================================================
 * Implements Sleep Hygiene Education based on Hauri (1977).
 *
 * Sleep hygiene refers to behavioral and environmental practices
 * that promote consistent, healthy sleep.
 *
 * Categories:
 * - Caffeine, alcohol, nicotine management
 * - Exercise timing
 * - Diet and eating habits
 * - Bedroom environment (temperature, light, noise)
 * - Screen time and blue light
 * - Pre-sleep routine
 * - Stress management
 *
 * Note: Sleep hygiene alone is often insufficient for chronic insomnia,
 * but it's an essential component of comprehensive CBT-I.
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type {
  ISleepHygieneEngine,
  ISleepHygieneAssessment,
  ISleepHygieneRecommendation,
  SleepHygieneCategory,
} from '../interfaces/ICBTIComponents';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

/**
 * Educational content by category
 */
const EDUCATIONAL_CONTENT: Record<
  SleepHygieneCategory,
  { title: string; content: string; tips: string[]; myths: string[] }
> = {
  caffeine: {
    title: 'Кофеин и сон',
    content:
      'Кофеин блокирует аденозиновые рецепторы, которые отвечают за чувство сонливости. Период полувыведения кофеина составляет 5-6 часов, но полное выведение может занимать до 12 часов.',
    tips: [
      'Прекращайте употребление кофеина за 6-8 часов до сна',
      'Учитывайте скрытые источники: чай, шоколад, энергетики, некоторые лекарства',
      'Норма кофеина — до 400 мг в день (около 4 чашек кофе)',
      'Постепенно снижайте дозу, если потребляете много кофеина',
    ],
    myths: [
      'Миф: "Я привык к кофеину, он на меня не действует" — кофеин влияет на сон даже при толерантности',
      'Миф: "Декаф не содержит кофеина" — содержит до 15 мг',
    ],
  },
  alcohol: {
    title: 'Алкоголь и сон',
    content:
      'Алкоголь может помочь заснуть, но нарушает архитектуру сна, подавляя REM-фазу и вызывая пробуждения во второй половине ночи по мере его метаболизма.',
    tips: [
      'Избегайте алкоголя за 3-4 часа до сна',
      'Не используйте алкоголь как снотворное',
      'Если пьёте, чередуйте с водой и не превышайте 1-2 порции',
      'Помните: алкоголь усиливает храп и апноэ',
    ],
    myths: [
      'Миф: "Алкоголь помогает мне спать" — качество сна ухудшается',
      'Миф: "Бокал вина расслабляет" — расслабление временное, сон страдает',
    ],
  },
  nicotine: {
    title: 'Никотин и сон',
    content:
      'Никотин — стимулятор, который увеличивает частоту сердечных сокращений и повышает артериальное давление. Курильщики чаще страдают от бессонницы и имеют более лёгкий сон.',
    tips: [
      'Не курите за 2-3 часа до сна',
      'Избегайте курения при ночных пробуждениях',
      'Рассмотрите отказ от курения — сон улучшится через 1-2 недели',
      'Никотиновые пластыри ночью могут нарушать сон',
    ],
    myths: [
      'Миф: "Сигарета помогает расслабиться" — никотин возбуждает нервную систему',
    ],
  },
  exercise: {
    title: 'Физическая активность и сон',
    content:
      'Регулярные упражнения улучшают качество сна, увеличивают долю глубокого сна и помогают быстрее засыпать. Однако интенсивные тренировки близко к сну могут мешать засыпанию.',
    tips: [
      'Заканчивайте интенсивные тренировки за 3-4 часа до сна',
      'Умеренные упражнения (йога, растяжка) возможны вечером',
      '150 минут умеренной активности в неделю улучшают сон',
      'Утренние тренировки на свету помогают настроить циркадные ритмы',
    ],
    myths: [
      'Миф: "Я устал — нужно отдыхать, не заниматься" — умеренная активность придаёт энергию',
    ],
  },
  diet: {
    title: 'Питание и сон',
    content:
      'Тяжёлая пища перед сном заставляет пищеварительную систему работать и может вызвать дискомфорт. Голод тоже мешает сну. Оптимален лёгкий перекус за 1-2 часа до сна.',
    tips: [
      'Избегайте тяжёлой пищи за 2-3 часа до сна',
      'Лёгкий перекус (банан, тёплое молоко, орехи) может помочь',
      'Продукты с триптофаном (индейка, молоко) способствуют выработке мелатонина',
      'Ограничьте жидкость перед сном, чтобы не просыпаться в туалет',
    ],
    myths: [
      'Миф: "Перед сном нельзя есть вообще" — лёгкий перекус не вредит',
    ],
  },
  environment: {
    title: 'Среда для сна',
    content:
      'Спальня должна быть прохладной (16-19°C), тёмной и тихой. Мозг ассоциирует эти условия со сном. Качество матраса и подушки тоже имеет значение.',
    tips: [
      'Поддерживайте температуру 16-19°C в спальне',
      'Используйте плотные шторы или маску для сна',
      'Белый шум может маскировать внешние звуки',
      'Уберите часы из поля зрения (не следите за временем ночью)',
      'Меняйте матрас каждые 7-10 лет',
    ],
    myths: [
      'Миф: "Мне комфортно в тепле" — тело естественно охлаждается для сна',
    ],
  },
  screen_time: {
    title: 'Экраны и синий свет',
    content:
      'Синий свет от экранов подавляет выработку мелатонина, гормона сна. Кроме того, контент на экранах может быть стимулирующим и мешать расслаблению.',
    tips: [
      'Откладывайте гаджеты за 1-2 часа до сна',
      'Включите ночной режим (тёплые тона) на устройствах',
      'Используйте очки с фильтром синего света вечером',
      'Замените вечерний скроллинг на книгу или аудио',
    ],
    myths: [
      'Миф: "Ночной режим полностью решает проблему" — контент всё равно стимулирует',
    ],
  },
  routine: {
    title: 'Режим и ритуалы сна',
    content:
      'Регулярный режим сна и бодрствования укрепляет циркадные ритмы. Последовательный ритуал перед сном сигнализирует мозгу, что пора готовиться ко сну.',
    tips: [
      'Ложитесь и вставайте в одно время, включая выходные (±30 мин)',
      'Создайте 20-30 минутный ритуал перед сном',
      'Включите в ритуал: тёплый душ, чтение, расслабление',
      'Тусклый свет за час до сна помогает выработке мелатонина',
    ],
    myths: [
      'Миф: "В выходные можно отоспаться" — это сбивает биоритмы',
    ],
  },
  stress: {
    title: 'Стресс и тревога',
    content:
      'Стресс активирует симпатическую нервную систему, повышая бдительность. Тревожные мысли в постели создают ассоциацию "кровать = тревога", усугубляя бессонницу.',
    tips: [
      'Выделите "время для беспокойства" днём (15-20 мин)',
      'Ведите дневник: выгрузите мысли до сна',
      'Практикуйте расслабление: дыхание, медитация',
      'Если не можете уснуть из-за мыслей — встаньте и запишите их',
    ],
    myths: [
      'Миф: "Я должен решить проблемы перед сном" — ночь не время для решений',
    ],
  },
};

/**
 * Sleep Hygiene Engine
 */
export class SleepHygieneEngine implements ISleepHygieneEngine {
  /**
   * Assess sleep hygiene from sleep state
   */
  assess(sleepState: ISleepState): ISleepHygieneAssessment {
    const behaviors = sleepState.behaviors;
    const scores: Record<SleepHygieneCategory, number> = {
      caffeine: this.assessCaffeine(behaviors.caffeine),
      alcohol: this.assessAlcohol(behaviors.alcohol),
      nicotine: 0.8, // Placeholder - would need nicotine data
      exercise: this.assessExercise(behaviors.exercise),
      diet: 0.7, // Placeholder - would need diet data
      environment: this.assessEnvironment(behaviors.environment),
      screen_time: this.assessScreenTime(behaviors.screenTimeBeforeBed),
      routine: this.assessRoutine(sleepState),
      stress: this.assessStress(sleepState),
    };

    // Calculate overall score
    const overallScore =
      Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

    // Identify top issues (scores below 0.6)
    const topIssues = (Object.entries(scores) as [SleepHygieneCategory, number][])
      .filter(([_, score]) => score < 0.6)
      .sort((a, b) => a[1] - b[1])
      .map(([category]) => category);

    // Generate recommendations
    const recommendations = this.generateRecommendations({ userId: sleepState.userId, date: sleepState.date, scores, overallScore, topIssues, recommendations: [] });

    return {
      userId: sleepState.userId,
      date: sleepState.date,
      scores,
      overallScore,
      topIssues,
      recommendations,
    };
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(
    assessment: ISleepHygieneAssessment,
    previousRecommendations?: ISleepHygieneRecommendation[]
  ): ISleepHygieneRecommendation[] {
    const recommendations: ISleepHygieneRecommendation[] = [];
    const previousIds = new Set(previousRecommendations?.map((r) => r.id) || []);

    for (const category of assessment.topIssues) {
      const score = assessment.scores[category];
      const priority: 'high' | 'medium' | 'low' =
        score < 0.4 ? 'high' : score < 0.6 ? 'medium' : 'low';

      const recs = this.getRecommendationsForCategory(category, priority);

      for (const rec of recs) {
        // Avoid repeating recent recommendations
        if (!previousIds.has(rec.id)) {
          recommendations.push(rec);
        }
      }
    }

    // Limit to top 5 recommendations
    return recommendations.slice(0, 5);
  }

  /**
   * Get educational content for category
   */
  getEducationalContent(category: SleepHygieneCategory): {
    title: string;
    content: string;
    tips: string[];
    myths: string[];
  } {
    return EDUCATIONAL_CONTENT[category];
  }

  /**
   * Track hygiene improvement over time
   */
  trackImprovement(assessmentHistory: ISleepHygieneAssessment[]): {
    improved: SleepHygieneCategory[];
    declined: SleepHygieneCategory[];
  } {
    if (assessmentHistory.length < 2) {
      return { improved: [], declined: [] };
    }

    const first = assessmentHistory[0];
    const last = assessmentHistory[assessmentHistory.length - 1];

    const improved: SleepHygieneCategory[] = [];
    const declined: SleepHygieneCategory[] = [];

    for (const category of Object.keys(first.scores) as SleepHygieneCategory[]) {
      const diff = last.scores[category] - first.scores[category];
      if (diff > 0.1) {
        improved.push(category);
      } else if (diff < -0.1) {
        declined.push(category);
      }
    }

    return { improved, declined };
  }

  // ============= Private Assessment Methods =============

  private assessCaffeine(caffeine: { dailyMg: number; lastIntakeTime: string; hoursBeforeBed: number }): number {
    let score = 1;

    // Penalize high daily intake
    if (caffeine.dailyMg > 400) score -= 0.3;
    else if (caffeine.dailyMg > 200) score -= 0.1;

    // Penalize late intake
    if (caffeine.hoursBeforeBed < 4) score -= 0.4;
    else if (caffeine.hoursBeforeBed < 6) score -= 0.2;

    return Math.max(0, score);
  }

  private assessAlcohol(alcohol: { drinksToday: number; lastDrinkTime: string }): number {
    let score = 1;

    if (alcohol.drinksToday > 2) score -= 0.4;
    else if (alcohol.drinksToday > 0) score -= 0.2;

    // Would need time calculation for last drink proximity to bed
    return Math.max(0, score);
  }

  private assessExercise(exercise: { didExercise: boolean; durationMinutes: number; hoursBeforeBed: number }): number {
    let score = 0.5; // Baseline

    if (exercise.didExercise) {
      score += 0.3; // Bonus for exercising

      // Penalize late intense exercise
      if (exercise.hoursBeforeBed < 2 && exercise.durationMinutes > 30) {
        score -= 0.3;
      }
    }

    return Math.min(1, Math.max(0, score));
  }

  private assessEnvironment(env: { temperatureCelsius: number; isQuiet: boolean; isDark: boolean; isComfortable: boolean }): number {
    let score = 0;

    // Temperature (optimal 16-19°C)
    if (env.temperatureCelsius >= 16 && env.temperatureCelsius <= 19) {
      score += 0.25;
    } else if (env.temperatureCelsius >= 14 && env.temperatureCelsius <= 22) {
      score += 0.15;
    }

    if (env.isQuiet) score += 0.25;
    if (env.isDark) score += 0.25;
    if (env.isComfortable) score += 0.25;

    return score;
  }

  private assessScreenTime(minutesBeforeBed: number): number {
    if (minutesBeforeBed <= 0) return 1;
    if (minutesBeforeBed <= 30) return 0.7;
    if (minutesBeforeBed <= 60) return 0.5;
    return 0.3;
  }

  private assessRoutine(sleepState: ISleepState): number {
    let score = 0.5;

    // Check circadian stability
    if (sleepState.circadian.isStable) score += 0.25;

    // Check social jet lag
    if (Math.abs(sleepState.circadian.socialJetLag) < 1) score += 0.25;
    else if (Math.abs(sleepState.circadian.socialJetLag) > 2) score -= 0.2;

    return Math.min(1, Math.max(0, score));
  }

  private assessStress(sleepState: ISleepState): number {
    const cognitions = sleepState.cognitions;

    let score = 1;
    score -= cognitions.sleepAnxiety * 0.3;
    score -= cognitions.preSleepArousal * 0.3;
    score -= (1 - cognitions.sleepSelfEfficacy) * 0.2;

    return Math.max(0, score);
  }

  // ============= Recommendation Generation =============

  private getRecommendationsForCategory(
    category: SleepHygieneCategory,
    priority: 'high' | 'medium' | 'low'
  ): ISleepHygieneRecommendation[] {
    const content = EDUCATIONAL_CONTENT[category];
    const tips = content.tips;

    return tips.slice(0, priority === 'high' ? 2 : 1).map((tip, i) => ({
      id: `${category}_${i}_${Date.now()}`,
      category,
      recommendation: tip,
      rationale: content.content,
      priority,
      isPersonalized: true,
      basedOn: `Low score in ${category}`,
    }));
  }
}
