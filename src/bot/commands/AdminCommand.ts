/**
 * Admin Dashboard Command
 * =======================
 * Telegram command for clinical pilot study monitoring.
 *
 * Compliance:
 * - ICH E6(R3): Centralized monitoring capabilities
 * - 21 CFR Part 11: Audit trail for all admin actions
 * - HIPAA: Minimum necessary access (role-based)
 * - 152-FZ: Personal data access logging
 *
 * Features:
 * - Real-time dashboard metrics
 * - User enrollment list
 * - ISI outcome tracking
 * - Safety monitoring (ISI worsening alerts)
 * - Audit trail viewing (super admin)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import {
  AdminDashboardService,
  createAdminDashboardService,
  type IDashboardMetrics,
  type IUserSummary,
} from '../services/AdminDashboardService';
import {
  AnonymizedDataExportService,
  createAnonymizedDataExportService,
  DEFAULT_EXPORT_CONFIG,
  type ExportFormat,
  type AnonymizationLevel,
} from '../services/AnonymizedDataExportService';

// ==================== Types ====================

type AdminStep =
  | 'main_menu'
  | 'dashboard'
  | 'user_list'
  | 'user_detail'
  | 'safety_alerts'
  | 'audit_log'
  | 'data_export'
  | 'unauthorized';

// ==================== Admin Command ====================

/**
 * Admin Dashboard Command
 * Provides centralized monitoring interface for clinical study administrators
 */
export class AdminCommand implements IConversationCommand {
  readonly name = 'admin';
  readonly description = 'Панель администратора (только для администраторов)';
  readonly aliases = ['dashboard', 'monitor'];
  readonly requiresSession = false;

  readonly steps: AdminStep[] = [
    'main_menu',
    'dashboard',
    'user_list',
    'user_detail',
    'safety_alerts',
    'audit_log',
    'data_export',
    'unauthorized',
  ];

  private adminService: AdminDashboardService | null = null;
  private exportService: AnonymizedDataExportService | null = null;

  /**
   * Get or create admin service
   */
  private getAdminService(ctx: ISleepCoreContext): AdminDashboardService {
    if (!this.adminService) {
      const db = ctx.sleepCore.db;
      if (!db) {
        throw new Error('Database connection not configured. Call sleepCore.setDatabase() first.');
      }
      this.adminService = createAdminDashboardService(db);
    }
    return this.adminService;
  }

  /**
   * Get or create export service
   */
  private getExportService(ctx: ISleepCoreContext): AnonymizedDataExportService {
    if (!this.exportService) {
      const db = ctx.sleepCore.db;
      if (!db) {
        throw new Error('Database connection not configured. Call sleepCore.setDatabase() first.');
      }
      this.exportService = createAnonymizedDataExportService(db);
    }
    return this.exportService;
  }

  /**
   * Execute admin command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);

    // Authorization check (HIPAA minimum necessary)
    if (!adminService.isAdmin(ctx.userId)) {
      // Log unauthorized access attempt
      console.warn(`[Admin] Unauthorized access attempt by user ${ctx.userId}`);

      return {
        success: false,
        message: formatter.error(
          'Доступ запрещён. Эта команда доступна только администраторам исследования.'
        ),
      };
    }

    // Log admin access
    adminService.logAdminAction(ctx.userId, ctx.displayName, 'VIEW_DASHBOARD');

    return this.showMainMenu(ctx);
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (step as AdminStep) {
      case 'main_menu':
        return this.showMainMenu(ctx);
      case 'dashboard':
        return this.showDashboard(ctx);
      case 'user_list':
        return this.showUserList(ctx, data);
      case 'user_detail':
        return this.showUserDetail(ctx, data);
      case 'safety_alerts':
        return this.showSafetyAlerts(ctx);
      case 'audit_log':
        return this.showAuditLog(ctx);
      case 'data_export':
        return this.showDataExportMenu(ctx);
      default:
        return this.showMainMenu(ctx);
    }
  }

  /**
   * Handle callback queries
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);

    // Re-check authorization on every action
    if (!adminService.isAdmin(ctx.userId)) {
      return {
        success: false,
        message: formatter.error('Сессия администратора истекла. Используйте /admin'),
      };
    }

    const [, action, param] = callbackData.split(':');

    switch (action) {
      case 'main':
        return this.showMainMenu(ctx);

      case 'dashboard':
        adminService.logAdminAction(ctx.userId, ctx.displayName, 'VIEW_DASHBOARD');
        return this.showDashboard(ctx);

      case 'users':
        adminService.logAdminAction(ctx.userId, ctx.displayName, 'VIEW_USER_LIST');
        return this.showUserList(ctx, conversationData);

      case 'users_page': {
        const page = parseInt(param, 10) || 0;
        return this.showUserList(ctx, { ...conversationData, page });
      }

      case 'user': {
        const userId = parseInt(param, 10);
        adminService.logAdminAction(ctx.userId, ctx.displayName, 'VIEW_USER_DETAIL', userId);
        return this.showUserDetail(ctx, { ...conversationData, targetUserId: userId });
      }

      case 'safety':
        adminService.logAdminAction(ctx.userId, ctx.displayName, 'VIEW_ADVERSE_EVENTS');
        return this.showSafetyAlerts(ctx);

      case 'audit':
        if (!adminService.isSuperAdmin(ctx.userId)) {
          return {
            success: false,
            message: formatter.error('Просмотр журнала аудита доступен только супер-администраторам.'),
          };
        }
        adminService.logAdminAction(ctx.userId, ctx.displayName, 'VIEW_AUDIT_LOG');
        return this.showAuditLog(ctx);

      case 'export':
        if (!adminService.isSuperAdmin(ctx.userId)) {
          return {
            success: false,
            message: formatter.error('Экспорт данных доступен только супер-администраторам.'),
          };
        }
        adminService.logAdminAction(ctx.userId, ctx.displayName, 'VIEW_DATA_EXPORT');
        return this.showDataExportMenu(ctx);

      case 'export_run': {
        if (!adminService.isSuperAdmin(ctx.userId)) {
          return {
            success: false,
            message: formatter.error('Экспорт данных доступен только супер-администраторам.'),
          };
        }
        const [format, level] = (param || 'csv:de_identified').split('_') as [ExportFormat, AnonymizationLevel];
        adminService.logAdminAction(ctx.userId, ctx.displayName, 'EXPORT_DATA');
        return this.performDataExport(ctx, format, level);
      }

      case 'refresh':
        return this.showDashboard(ctx);

      default:
        return this.showMainMenu(ctx);
    }
  }

  // ==================== View Methods ====================

  /**
   * Show main admin menu
   */
  private async showMainMenu(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);
    const role = adminService.getUserRole(ctx.userId);

    const roleLabel = role === 'super_admin' ? 'Супер-администратор' : 'Администратор';

    const message = `
${formatter.header('Панель администратора')}

👤 *${ctx.displayName}*
🔑 Роль: ${roleLabel}

${formatter.divider()}

Выберите раздел для просмотра:
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Дашборд метрик', callbackData: 'admin:dashboard' }],
      [{ text: '👥 Список участников', callbackData: 'admin:users' }],
      [{ text: '⚠️ Оповещения безопасности', callbackData: 'admin:safety' }],
    ];

    // Super admin only: audit log and data export
    if (adminService.isSuperAdmin(ctx.userId)) {
      keyboard.push([{ text: '📋 Журнал аудита', callbackData: 'admin:audit' }]);
      keyboard.push([{ text: '📤 Экспорт данных', callbackData: 'admin:export' }]);
    }

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Show dashboard with metrics
   */
  private async showDashboard(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);

    try {
      const metrics = await adminService.getDashboardMetrics();
      const message = this.formatDashboardMessage(metrics);

      const keyboard: IInlineButton[][] = [
        [{ text: '🔄 Обновить', callbackData: 'admin:refresh' }],
        [{ text: '👥 Участники', callbackData: 'admin:users' }],
        [{ text: '◀️ Назад', callbackData: 'admin:main' }],
      ];

      return {
        success: true,
        message,
        keyboard,
      };
    } catch (error) {
      console.error('[Admin] Dashboard error:', error);
      return {
        success: false,
        message: formatter.error('Ошибка загрузки метрик. Попробуйте позже.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:main' }]],
      };
    }
  }

  /**
   * Format dashboard metrics message
   */
  private formatDashboardMessage(metrics: IDashboardMetrics): string {
    const { enrollment, isiOutcomes, engagement, safety, compliance, generatedAt } = metrics;

    // Calculate retention rate
    const retentionRate =
      enrollment.withConsent > 0
        ? Math.round((enrollment.active7Days / enrollment.withConsent) * 100)
        : 0;

    // ISI improvement rate
    const improvementRate =
      isiOutcomes.latestCount > 0
        ? Math.round((isiOutcomes.mcidAchieved / isiOutcomes.latestCount) * 100)
        : 0;

    return `
${formatter.header('📊 Дашборд исследования')}

*Набор участников*
• Всего: ${enrollment.total}
• С согласием: ${enrollment.withConsent}
• Активны (7д): ${enrollment.active7Days}
• Активны (30д): ${enrollment.active30Days}
• Выбыли: ${enrollment.dropouts}
• Retention: ${formatter.progressBar(retentionRate, 8)}

${formatter.divider()}

*Исходы ISI*
• Baseline (n=${isiOutcomes.baselineCount}): ${isiOutcomes.averageBaseline} ± SD
• Текущий (n=${isiOutcomes.latestCount}): ${isiOutcomes.averageLatest} ± SD
• MCID достигнут (≥7): ${isiOutcomes.mcidAchieved} (${improvementRate}%)
• Ремиссия (ISI<8): ${isiOutcomes.remissionAchieved}

${formatter.divider()}

*Вовлечённость*
• Заполнение дневника: ${engagement.diaryCompletionRate}%
• Ср. сессий/юзер: ${engagement.averageSessionsPerUser}
• Ср. streak: ${engagement.averageStreakDays} дней
• Квесты выполнены: ${engagement.questCompletionRate}%

${formatter.divider()}

*Безопасность* ${safety.isiWorseningCount > 0 ? '⚠️' : '✅'}
• AE всего: ${safety.adverseEventsTotal}
• SAE: ${safety.adverseEventsSerious}
• ISI ухудшение (≥7): ${safety.isiWorseningCount}

${formatter.divider()}

*Комплаенс*
• Согласия получено: ${compliance.consentedUsers}
• Запросы на экспорт: ${compliance.dataExportRequests}
• Анонимизаций: ${compliance.anonymizationRequests}

${formatter.divider()}
_Обновлено: ${formatter.formatTime(generatedAt)}_
    `.trim();
  }

  /**
   * Show user list with pagination
   */
  private async showUserList(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);
    const page = (data.page as number) || 0;
    const pageSize = 10;

    try {
      const users = await adminService.getUserList(pageSize, page * pageSize);

      if (users.length === 0 && page === 0) {
        return {
          success: true,
          message: formatter.info('Участников пока нет.'),
          keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:main' }]],
        };
      }

      const userLines = users.map((user) => {
        const statusIcon = this.getStatusIcon(user.status);
        const isiChange = user.isiChange !== null ? (user.isiChange >= 0 ? `↓${user.isiChange}` : `↑${Math.abs(user.isiChange)}`) : '-';
        return `${statusIcon} *${user.displayName}* (W${user.currentWeek}) ISI: ${user.latestISI ?? '-'} (${isiChange})`;
      });

      const message = `
${formatter.header('👥 Участники исследования')}

Страница ${page + 1}

${userLines.join('\n')}

${formatter.divider()}
${formatter.tip('Нажмите на ID для подробностей')}
      `.trim();

      // Build keyboard with user buttons
      const keyboard: IInlineButton[][] = [];

      // User selection buttons (2 per row)
      for (let i = 0; i < users.length; i += 2) {
        const row: IInlineButton[] = [];
        row.push({
          text: `${users[i].displayName.slice(0, 12)}`,
          callbackData: `admin:user:${users[i].id}`,
        });
        if (users[i + 1]) {
          row.push({
            text: `${users[i + 1].displayName.slice(0, 12)}`,
            callbackData: `admin:user:${users[i + 1].id}`,
          });
        }
        keyboard.push(row);
      }

      // Pagination
      const navRow: IInlineButton[] = [];
      if (page > 0) {
        navRow.push({ text: '◀️ Пред.', callbackData: `admin:users_page:${page - 1}` });
      }
      if (users.length === pageSize) {
        navRow.push({ text: 'След. ▶️', callbackData: `admin:users_page:${page + 1}` });
      }
      if (navRow.length > 0) {
        keyboard.push(navRow);
      }

      keyboard.push([{ text: '◀️ Назад', callbackData: 'admin:main' }]);

      return {
        success: true,
        message,
        keyboard,
      };
    } catch (error) {
      console.error('[Admin] User list error:', error);
      return {
        success: false,
        message: formatter.error('Ошибка загрузки списка участников.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:main' }]],
      };
    }
  }

  /**
   * Show user detail
   */
  private async showUserDetail(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);
    const targetUserId = data.targetUserId as number;

    if (!targetUserId) {
      return {
        success: false,
        message: formatter.error('ID участника не указан.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:users' }]],
      };
    }

    try {
      const detail = await adminService.getUserDetail(targetUserId);

      if (!detail) {
        return {
          success: false,
          message: formatter.error('Участник не найден.'),
          keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:users' }]],
        };
      }

      const { user, isiHistory } = detail;

      // Format ISI history
      const isiHistoryLines =
        isiHistory.length > 0
          ? isiHistory.map((h) => `  W${h.week}: ${h.score} (${formatter.formatShortDate(h.date)})`).join('\n')
          : '  Нет данных';

      // Safety alert for worsening
      const safetyAlert =
        user.isiChange !== null && user.isiChange < -6
          ? '\n⚠️ *ВНИМАНИЕ: Значительное ухудшение ISI*'
          : '';

      const message = `
${formatter.header('👤 Карточка участника')}

*${user.displayName}*
ID: ${user.id} | External: ${user.externalId.slice(0, 8)}...

${formatter.divider()}

*Статус*
• Фаза: Неделя ${user.currentWeek}
• Статус: ${this.getStatusLabel(user.status)}
• Согласие: ${user.consentGiven ? '✅ Да' : '❌ Нет'}
• Последняя активность: ${user.lastActivityAt ? formatter.formatDate(user.lastActivityAt) : '-'}

${formatter.divider()}

*ISI История*${safetyAlert}
• Baseline: ${user.baselineISI ?? '-'}
• Текущий: ${user.latestISI ?? '-'}
• Изменение: ${user.isiChange !== null ? (user.isiChange >= 0 ? `↓${user.isiChange}` : `↑${Math.abs(user.isiChange)}`) : '-'}

${isiHistoryLines}

${formatter.divider()}

*Активность*
• Записей дневника: ${user.diaryCount}
• Сессий терапии: ${user.sessionCount}
• Зарегистрирован: ${formatter.formatDate(user.enrollmentDate)}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '◀️ К списку', callbackData: 'admin:users' }],
        [{ text: '🏠 Главное меню', callbackData: 'admin:main' }],
      ];

      return {
        success: true,
        message,
        keyboard,
      };
    } catch (error) {
      console.error('[Admin] User detail error:', error);
      return {
        success: false,
        message: formatter.error('Ошибка загрузки данных участника.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:users' }]],
      };
    }
  }

  /**
   * Show safety alerts
   */
  private async showSafetyAlerts(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);

    try {
      const metrics = await adminService.getDashboardMetrics();
      const users = await adminService.getUserList(100, 0);

      // Find users with significant ISI worsening
      const worseningUsers = users.filter(
        (u) => u.isiChange !== null && u.isiChange < -6
      );

      // Find inactive users (potential dropouts)
      const inactiveUsers = users.filter((u) => u.status === 'inactive' || u.status === 'dropped');

      let alertsSection = '';

      if (worseningUsers.length > 0) {
        alertsSection += `\n*🔴 ISI Ухудшение (≥7 баллов)*\n`;
        worseningUsers.forEach((u) => {
          alertsSection += `• ${u.displayName}: ${u.baselineISI} → ${u.latestISI} (${u.isiChange})\n`;
        });
      }

      if (inactiveUsers.length > 0) {
        alertsSection += `\n*🟡 Неактивные участники*\n`;
        inactiveUsers.slice(0, 5).forEach((u) => {
          const days = u.lastActivityAt
            ? Math.floor((Date.now() - u.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
            : '?';
          alertsSection += `• ${u.displayName}: ${days} дней без активности\n`;
        });
        if (inactiveUsers.length > 5) {
          alertsSection += `  _...и ещё ${inactiveUsers.length - 5}_\n`;
        }
      }

      if (!alertsSection) {
        alertsSection = '\n✅ Активных оповещений нет.';
      }

      const message = `
${formatter.header('⚠️ Оповещения безопасности')}

*Сводка*
• AE всего: ${metrics.safety.adverseEventsTotal}
• SAE (серьёзные): ${metrics.safety.adverseEventsSerious}
• ISI ухудшение: ${metrics.safety.isiWorseningCount}

${formatter.divider()}
${alertsSection}

${formatter.divider()}
${formatter.tip('При серьёзных AE следуйте протоколу ADVERSE_EVENT_PLAN.md')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🔄 Обновить', callbackData: 'admin:safety' }],
        [{ text: '◀️ Назад', callbackData: 'admin:main' }],
      ];

      return {
        success: true,
        message,
        keyboard,
      };
    } catch (error) {
      console.error('[Admin] Safety alerts error:', error);
      return {
        success: false,
        message: formatter.error('Ошибка загрузки оповещений.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:main' }]],
      };
    }
  }

  /**
   * Show audit log (super admin only)
   */
  private async showAuditLog(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);

    if (!adminService.isSuperAdmin(ctx.userId)) {
      return {
        success: false,
        message: formatter.error('Доступ запрещён.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:main' }]],
      };
    }

    const auditLog = adminService.getAuditLog(20);

    const logLines =
      auditLog.length > 0
        ? auditLog
            .reverse()
            .map((entry) => {
              const time = formatter.formatTime(entry.timestamp);
              const target = entry.targetUserId ? ` → User:${entry.targetUserId}` : '';
              return `${time} | ${entry.adminName} | ${entry.action}${target}`;
            })
            .join('\n')
        : 'Журнал пуст.';

    const message = `
${formatter.header('📋 Журнал аудита')}

_Последние 20 записей (21 CFR Part 11)_

\`\`\`
${logLines}
\`\`\`

${formatter.divider()}
${formatter.tip('Полный журнал доступен в системных логах')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔄 Обновить', callbackData: 'admin:audit' }],
      [{ text: '◀️ Назад', callbackData: 'admin:main' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Show data export menu
   * Compliance: GDPR Art. 89, HIPAA Safe Harbor, 152-FZ
   */
  private async showDataExportMenu(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const adminService = this.getAdminService(ctx);

    if (!adminService.isSuperAdmin(ctx.userId)) {
      return {
        success: false,
        message: formatter.error('Доступ запрещён.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:main' }]],
      };
    }

    const message = `
${formatter.header('📤 Экспорт анонимизированных данных')}

*Уровни анонимизации*
• *Псевдонимизация* - HMAC-SHA256 идентификаторы
• *Де-идентификация* - 18 HIPAA Safe Harbor идентификаторов удалены
• *Анонимизация* - Полное удаление, k-анонимность

${formatter.divider()}

*Форматы экспорта*
• CSV - Для статистических пакетов (SPSS, R)
• JSON - Структурированные данные
• NDJSON - Потоковая обработка, FHIR-совместимый

${formatter.divider()}

*Включаемые данные*
• ISI assessments (baseline + follow-up)
• Дневники сна (агрегировано)
• Сессии терапии
• Adverse Events (если есть)

${formatter.divider()}
${formatter.tip('Все экспорты логируются в журнал аудита (21 CFR Part 11)')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '📊 CSV (де-идент.)', callbackData: 'admin:export_run:csv_de_identified' },
        { text: '📊 CSV (анон.)', callbackData: 'admin:export_run:csv_anonymized' },
      ],
      [
        { text: '📄 JSON (де-идент.)', callbackData: 'admin:export_run:json_de_identified' },
        { text: '📄 JSON (анон.)', callbackData: 'admin:export_run:json_anonymized' },
      ],
      [{ text: '◀️ Назад', callbackData: 'admin:main' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Perform data export with selected format and anonymization level
   */
  private async performDataExport(
    ctx: ISleepCoreContext,
    format: ExportFormat,
    level: AnonymizationLevel
  ): Promise<ICommandResult> {
    const exportService = this.getExportService(ctx);
    const adminService = this.getAdminService(ctx);

    try {
      const config = {
        ...DEFAULT_EXPORT_CONFIG,
        format,
        level,
      };

      const result = await exportService.exportDataset(
        config,
        ctx.userId
      );

      // Generate data sharing statement for publications
      const sharingStatement = exportService.generateDataSharingStatement(config);

      // Format level label
      const levelLabels: Record<AnonymizationLevel, string> = {
        pseudonymized: 'Псевдонимизированный',
        de_identified: 'Де-идентифицированный',
        anonymized: 'Анонимизированный',
      };

      // k-anonymity validation for small datasets
      const kValidation = exportService.validateKAnonymity(
        result.dataset.participants,
        config.kAnonymity,
        ['ageGroup', 'sex']
      );

      const smallestGroup = kValidation.violations.length > 0
        ? Math.min(...kValidation.violations.map(v => v.count))
        : config.kAnonymity;

      const kWarning = !kValidation.valid
        ? `\n⚠️ *Внимание*: k-анонимность (k=${config.kAnonymity}) не достигнута.\nМинимальный размер группы: ${smallestGroup}\nРекомендуется увеличить обобщение данных.`
        : `✅ k-анонимность (k=${config.kAnonymity}) подтверждена`;

      const message = `
${formatter.header('📤 Экспорт выполнен')}

*Параметры*
• Формат: ${format.toUpperCase()}
• Уровень: ${levelLabels[level]}
• Участников: ${result.dataset.participants.length}
• ISI оценок: ${result.dataset.isiAssessments?.length || 0}
• Записей дневника: ${result.dataset.diaryEntries?.length || 0}
• AE событий: ${result.dataset.adverseEvents?.length || 0}

${formatter.divider()}

*Контроль качества*
• Checksum: \`${result.checksum.slice(0, 16)}...\`
${kWarning}

${formatter.divider()}

*ICMJE Data Sharing Statement*
${sharingStatement}

${formatter.divider()}

*Аудит*
• Export ID: ${result.auditEntry.exportId.slice(0, 8)}
• Время: ${formatter.formatTime(result.auditEntry.timestamp)}
• Администратор: ${ctx.displayName}

${formatter.tip('Данные готовы для передачи исследователям')}
      `.trim();

      // Log successful export
      adminService.logAdminAction(ctx.userId, ctx.displayName, 'EXPORT_DATA');

      const keyboard: IInlineButton[][] = [
        [{ text: '📤 Новый экспорт', callbackData: 'admin:export' }],
        [{ text: '◀️ Назад', callbackData: 'admin:main' }],
      ];

      return {
        success: true,
        message,
        keyboard,
      };
    } catch (error) {
      console.error('[Admin] Data export error:', error);
      return {
        success: false,
        message: formatter.error('Ошибка экспорта данных. Проверьте логи.'),
        keyboard: [[{ text: '◀️ Назад', callbackData: 'admin:export' }]],
      };
    }
  }

  // ==================== Helpers ====================

  private getStatusIcon(status: IUserSummary['status']): string {
    const icons: Record<IUserSummary['status'], string> = {
      active: '🟢',
      inactive: '🟡',
      dropped: '🔴',
      completed: '✅',
    };
    return icons[status];
  }

  private getStatusLabel(status: IUserSummary['status']): string {
    const labels: Record<IUserSummary['status'], string> = {
      active: 'Активен',
      inactive: 'Неактивен',
      dropped: 'Выбыл',
      completed: 'Завершил',
    };
    return labels[status];
  }
}

// ==================== Export ====================

export const adminCommand = new AdminCommand();
export default AdminCommand;
