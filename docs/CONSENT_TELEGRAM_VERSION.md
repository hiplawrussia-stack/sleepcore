# SleepCore Telegram Consent / Согласие для Telegram

> **Version**: 2.0
> **Date**: 2026-01-11
> **Compliance**: ФЗ-152 (01.09.2025)

---

## Краткая форма согласия для Telegram-бота

Эта форма используется в боте как первичное согласие. Полная форма: `INFORMED_CONSENT_FORM.md`

---

### Текст согласия в боте (RU)

```
📋 ИНФОРМИРОВАННОЕ СОГЛАСИЕ

Вы приглашаетесь участвовать в пилотном исследовании SleepCore — приложения для терапии бессонницы.

📌 КЛЮЧЕВАЯ ИНФОРМАЦИЯ:

• Тип: Пилотное исследование (N=10-30)
• Срок: 4-6 недель активного использования
• Что делать: Вести дневник сна, отвечать на опросники
• Риски: Временная сонливость в первые 1-2 недели
• Польза: Возможное улучшение сна

🔒 ЗАЩИТА ДАННЫХ:

• Ваши данные зашифрованы (AES-256)
• Данные не продаются третьим лицам
• Вы можете отозвать согласие в любой момент

🆘 БЕЗОПАСНОСТЬ:

• Система автоматически обнаруживает кризисные состояния
• При обнаружении кризиса — немедленная помощь
• Команда /sos всегда доступна

⚖️ ВАШИ ПРАВА:

• Участие добровольное
• Вы можете выйти без последствий
• Вы можете запросить удаление данных

📄 В соответствии с ФЗ-152 «О персональных данных» (ред. 01.09.2025), данное согласие является отдельным документом.

Полная форма согласия доступна по команде /consent_full
```

---

### Кнопки согласия

```
[✅ Я согласен(на) участвовать]
[❌ Я отказываюсь]
[📄 Полный текст согласия]
```

---

### Текст согласия в боте (EN)

```
📋 INFORMED CONSENT

You are invited to participate in SleepCore pilot study — an app for insomnia therapy.

📌 KEY INFORMATION:

• Type: Pilot study (N=10-30)
• Duration: 4-6 weeks of active use
• What to do: Keep sleep diary, complete questionnaires
• Risks: Temporary sleepiness in first 1-2 weeks
• Benefits: Potential sleep improvement

🔒 DATA PROTECTION:

• Your data is encrypted (AES-256)
• Data is not sold to third parties
• You can withdraw consent at any time

🆘 SAFETY:

• System automatically detects crisis states
• Immediate help if crisis detected
• /sos command always available

⚖️ YOUR RIGHTS:

• Participation is voluntary
• You can withdraw without consequences
• You can request data deletion

📄 Per Federal Law 152-FZ "On Personal Data" (Sept 1, 2025 edition), this consent is a separate document.

Full consent form available via /consent_full
```

---

### Callback данные

| Callback | Action |
|----------|--------|
| `consent_accept` | User accepts, record consent timestamp |
| `consent_decline` | User declines, show alternatives |
| `consent_full` | Show full consent form link |

---

### Аудит согласия

При принятии согласия записывается:

```typescript
interface ConsentRecord {
  userId: number;
  consentGiven: boolean;
  consentTimestamp: string; // ISO 8601
  consentVersion: string;   // "2.0"
  consentMethod: 'telegram_bot';
  ipAddress?: string;       // if available
  userAgent?: string;       // "Telegram Bot"
}
```

---

### Текст при отказе

```
Вы отказались от участия в исследовании. Это не повлечёт никаких последствий.

Если вы передумаете, вы можете начать заново командой /start

Альтернативы:
• Обратитесь к врачу-сомнологу
• Используйте бесплатные ресурсы по гигиене сна
• Телефон доверия: 8-800-2000-122
```

---

### Подтверждение согласия

```
✅ Согласие получено

Дата: {timestamp}
Версия: 2.0
ID участника: {participantId}

Ваше согласие записано. Вы можете отозвать его в любой момент командой /withdraw

Сохраните этот идентификатор для своих записей.

Теперь давайте начнём с короткого опросника ISI...
```

---

## Интеграция с ботом

### Проверка согласия

```typescript
// Middleware для проверки согласия
async function checkConsent(ctx, next) {
  if (!ctx.session.consentGiven) {
    await showConsentForm(ctx);
    return;
  }
  return next();
}
```

### Запись согласия

```typescript
// При нажатии "Согласен"
async function recordConsent(ctx) {
  const consentRecord = {
    userId: ctx.from.id,
    consentGiven: true,
    consentTimestamp: new Date().toISOString(),
    consentVersion: '2.0',
    consentMethod: 'telegram_bot',
  };

  await userRepository.recordConsent(ctx.session.dbUserId);

  // ICH E6(R3) Audit
  await auditService.logConsent(ctx.session.dbUserId, true, {
    metadata: { version: '2.0' },
  });
}
```

---

## Compliance Checklist

- [x] Separate document (ФЗ-152 Sept 2025)
- [x] Clear purpose statement
- [x] Risks and benefits
- [x] Data protection explanation
- [x] Voluntary participation
- [x] Right to withdraw
- [x] Crisis detection disclosure
- [x] Contact information
- [x] Audit trail
- [x] Version control

---

*Document prepared: 2026-01-11*
*Version: 2.0*
