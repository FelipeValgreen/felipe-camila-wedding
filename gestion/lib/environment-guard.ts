import 'server-only';

import {
  resolveGestionRuntimeEnvironment,
  shouldBlockDatabaseWrite,
  shouldBlockExternalSync,
  type GestionRuntimeEnvironment,
} from './environment-policy';

export type { GestionRuntimeEnvironment } from './environment-policy';

export function getGestionRuntimeEnvironment(): GestionRuntimeEnvironment {
  return resolveGestionRuntimeEnvironment(process.env.VERCEL_ENV, process.env.NODE_ENV);
}

export function getDatabaseWriteBlock() {
  const environment = getGestionRuntimeEnvironment();

  if (!shouldBlockDatabaseWrite({
    environment,
    allowNonProductionWrites: process.env.ALLOW_NON_PRODUCTION_WRITES,
  })) {
    return null;
  }

  return {
    ok: false as const,
    error: 'NON_PRODUCTION_WRITE_BLOCKED',
    environment,
    message: 'Las escrituras están bloqueadas en este entorno. Configura un staging aislado y habilita ALLOW_NON_PRODUCTION_WRITES=true sólo allí.'
  };
}

export function getExternalSyncBlock() {
  const environment = getGestionRuntimeEnvironment();

  if (!shouldBlockExternalSync({
    environment,
    allowNonProductionWrites: process.env.ALLOW_NON_PRODUCTION_WRITES,
    allowNonProductionExternalSync: process.env.ALLOW_NON_PRODUCTION_EXTERNAL_SYNC,
  })) {
    return null;
  }

  const writeBlock = getDatabaseWriteBlock();
  if (writeBlock) return writeBlock;

  return {
    ok: false as const,
    error: 'NON_PRODUCTION_EXTERNAL_SYNC_BLOCKED',
    environment,
    message: 'La sincronización externa está bloqueada fuera de producción. Usa una planilla de prueba y habilita ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=true sólo en staging.'
  };
}
