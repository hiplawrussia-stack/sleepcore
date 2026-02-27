/**
 * Privacy Policy Page
 * ===================
 * GDPR/152-FZ compliant privacy policy display.
 * Summarized version for in-app viewing with link to full policy.
 *
 * @see docs/PRIVACY_POLICY.md - Full policy document
 * @module @sleepcore/mini-app/pages
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common';
import { useTelegram } from '@/hooks';

/** Policy section component */
const PolicySection: React.FC<{
  icon: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <Card className="mb-4">
    <div className="flex items-start gap-3">
      <span className="text-xl" aria-hidden="true">{icon}</span>
      <div className="flex-1">
        <h3 className="font-semibold text-night-100 mb-2">{title}</h3>
        <div className="text-sm text-night-300 space-y-2">
          {children}
        </div>
      </div>
    </div>
  </Card>
);

export const PrivacyPolicy: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { showBackButton, hideBackButton, openLink } = useTelegram();
  const isRu = i18n.language === 'ru';

  // Setup back button
  useEffect(() => {
    showBackButton(() => {
      navigate('/profile');
    });

    return () => {
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate]);

  const handleOpenFullPolicy = () => {
    // Link to hosted policy (when available) or GitHub
    openLink('https://github.com/AnotherWay-Labs/sleepcore/blob/main/docs/PRIVACY_POLICY.md');
  };

  return (
    <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-4xl mb-3 block" aria-hidden="true">🔒</span>
        <h1 className="text-2xl font-bold text-night-100 mb-2">
          {isRu ? 'Политика конфиденциальности' : 'Privacy Policy'}
        </h1>
        <p className="text-night-400 text-sm">
          {isRu ? 'Версия 1.0.0 • Обновлено: 08.01.2026' : 'Version 1.0.0 • Updated: Jan 8, 2026'}
        </p>
      </div>

      {/* Data Controller */}
      <PolicySection
        icon="🏢"
        title={isRu ? 'Оператор данных' : 'Data Controller'}
      >
        <p>
          {isRu
            ? 'БФ «Другой путь» является оператором персональных данных в соответствии с ФЗ-152.'
            : 'SleepCore is the data controller in accordance with GDPR.'}
        </p>
        <p className="text-night-400">
          Email: privacy@sleepcore.app
        </p>
      </PolicySection>

      {/* Data We Collect */}
      <PolicySection
        icon="📋"
        title={isRu ? 'Какие данные мы собираем' : 'Data We Collect'}
      >
        <ul className="list-disc list-inside space-y-1">
          <li>{isRu ? 'Идентификационные данные (имя, Telegram ID)' : 'Identity data (name, Telegram ID)'}</li>
          <li>{isRu ? 'Данные о здоровье (дневник сна, ISI, прогресс терапии)' : 'Health data (sleep diary, ISI, therapy progress)'}</li>
          <li>{isRu ? 'Данные об использовании (сессии, статистика)' : 'Usage data (sessions, statistics)'}</li>
        </ul>
        <p className="mt-2 text-night-400">
          {isRu
            ? 'Все данные о здоровье зашифрованы AES-256-GCM.'
            : 'All health data is encrypted with AES-256-GCM.'}
        </p>
      </PolicySection>

      {/* Data We Don't Collect */}
      <PolicySection
        icon="🚫"
        title={isRu ? 'Данные, которые мы НЕ собираем' : 'Data We Do NOT Collect'}
      >
        <ul className="list-disc list-inside space-y-1">
          <li>{isRu ? 'Биометрические данные' : 'Biometric data'}</li>
          <li>{isRu ? 'Точное местоположение (GPS)' : 'Precise location (GPS)'}</li>
          <li>{isRu ? 'Голосовые записи' : 'Voice recordings'}</li>
          <li>{isRu ? 'Платёжные данные (обрабатываются третьими лицами)' : 'Payment details (processed by third parties)'}</li>
        </ul>
      </PolicySection>

      {/* Your Rights */}
      <PolicySection
        icon="⚖️"
        title={isRu ? 'Ваши права' : 'Your Rights'}
      >
        <p>
          {isRu
            ? 'В соответствии с GDPR и ФЗ-152 вы имеете право:'
            : 'Under GDPR and applicable laws, you have the right to:'}
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>
            <strong>{isRu ? 'Доступ' : 'Access'}</strong> — {isRu ? 'получить копию ваших данных' : 'obtain a copy of your data'}
          </li>
          <li>
            <strong>{isRu ? 'Исправление' : 'Rectification'}</strong> — {isRu ? 'исправить неточные данные' : 'correct inaccurate data'}
          </li>
          <li>
            <strong>{isRu ? 'Удаление' : 'Erasure'}</strong> — {isRu ? 'удалить ваши данные' : 'delete your data'}
          </li>
          <li>
            <strong>{isRu ? 'Переносимость' : 'Portability'}</strong> — {isRu ? 'экспорт данных в JSON' : 'export data in JSON'}
          </li>
          <li>
            <strong>{isRu ? 'Отзыв согласия' : 'Withdraw consent'}</strong> — {isRu ? 'в любое время' : 'at any time'}
          </li>
        </ul>
        <p className="mt-2 text-night-400">
          {isRu
            ? 'Реализуйте эти права в разделе «Приватность и данные» профиля.'
            : 'Exercise these rights in the Privacy Center on your profile.'}
        </p>
      </PolicySection>

      {/* Data Security */}
      <PolicySection
        icon="🛡️"
        title={isRu ? 'Безопасность данных' : 'Data Security'}
      >
        <ul className="list-disc list-inside space-y-1">
          <li>{isRu ? 'Шифрование AES-256-GCM для медицинских данных' : 'AES-256-GCM encryption for health data'}</li>
          <li>{isRu ? 'TLS 1.3 для передачи данных' : 'TLS 1.3 for data transmission'}</li>
          <li>{isRu ? 'Аудит-логи хранятся 6 лет' : 'Audit logs retained for 6 years'}</li>
          <li>{isRu ? 'Резервные копии зашифрованы' : 'Backups are encrypted'}</li>
        </ul>
      </PolicySection>

      {/* Data Retention */}
      <PolicySection
        icon="📅"
        title={isRu ? 'Сроки хранения' : 'Data Retention'}
      >
        <ul className="list-disc list-inside space-y-1">
          <li>{isRu ? 'Данные аккаунта: пока аккаунт активен' : 'Account data: while account is active'}</li>
          <li>{isRu ? 'Дневник сна: 3 года после последней активности' : 'Sleep diary: 3 years after last activity'}</li>
          <li>{isRu ? 'Результаты оценок: 6 лет' : 'Assessment results: 6 years'}</li>
          <li>{isRu ? 'Аудит-логи: 6 лет (требования регулятора)' : 'Audit logs: 6 years (regulatory requirement)'}</li>
        </ul>
      </PolicySection>

      {/* Contact */}
      <PolicySection
        icon="📧"
        title={isRu ? 'Контакты' : 'Contact Us'}
      >
        <p>
          {isRu ? 'По вопросам защиты данных:' : 'For data protection inquiries:'}
        </p>
        <p className="mt-1">
          <strong>Email:</strong> privacy@sleepcore.app
        </p>
        <p>
          <strong>DPO:</strong> dpo@sleepcore.app
        </p>
        <p className="mt-2 text-night-400">
          {isRu
            ? 'Жалобы можно подать в Роскомнадзор или местный орган по защите данных.'
            : 'Complaints may be filed with your local Data Protection Authority.'}
        </p>
      </PolicySection>

      {/* Full Policy Link */}
      <div className="mt-6 text-center">
        <button
          onClick={handleOpenFullPolicy}
          className="px-6 py-3 bg-night-800 text-night-200 rounded-xl hover:bg-night-700 transition-colors"
        >
          {isRu ? '📄 Полная версия политики' : '📄 Full Policy Document'}
        </button>
        <p className="text-xs text-night-500 mt-3">
          {isRu
            ? 'GDPR (EU) 2016/679 • ФЗ-152 (РФ) • HIPAA (США)'
            : 'GDPR (EU) 2016/679 • 152-FZ (Russia) • HIPAA (USA)'}
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
