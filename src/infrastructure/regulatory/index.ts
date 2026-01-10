/**
 * Regulatory Infrastructure
 * =========================
 * Services for compliance with Russian medical device regulations.
 *
 * Compliance:
 * - Приказ Минздрава №181н от 11.04.2025
 * - Приказ Росздравнадзора №4472 от 21.07.2025
 * - ПП РФ №1684 (регистрация медизделий)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/regulatory
 */

// Roszdravnadzor API Service
export {
  RoszdravnadzorAPIService,
  createRoszdravnadzorAPIService,
  roszdravnadzorAPIService,
  initializeRoszdravnadzorService,
  AIS_ENDPOINTS,
  REQUIRED_FIELDS,
  CHANGE_PROCEDURES,
  DEFAULT_CONFIG,
} from './RoszdravnadzorAPIService';

// Types
export type {
  IDeviceIdentification,
  IErrorMetrics,
  IOperationalData,
  IRoszdravnadzorReport,
  IAISResponse,
  IVersionChangeNotification,
  ICybersecurityIncident,
  IRoszdravnadzorConfig,
  TransmissionStatus,
  ITransmissionRecord,
  IQueueStatus,
  IServiceStatus,
} from './RoszdravnadzorAPIService';
