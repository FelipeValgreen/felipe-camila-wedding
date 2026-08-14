import 'server-only';

import {
  evaluateDatabaseWritePolicy,
  evaluateExternalSyncPolicy,
  resolveGestionRuntimeEnvironment,
  type GestionRuntimeEnvironment
} from './runtime-policy';

export type { GestionRuntimeEnvironment } from './runtime-policy';

export function getGestionRuntimeEnvironment(): GestionRuntimeEnvironment {
  return resolveGestionRuntimeEnvironment(process.env);
}

export function getDatabaseWriteBlock() {
  return evaluateDatabaseWritePolicy(process.env);
}

export function getExternalSyncBlock() {
  return evaluateExternalSyncPolicy(process.env);
}
