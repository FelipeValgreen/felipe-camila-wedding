import 'server-only';

export type GestionRuntimeEnvironment = 'production' | 'preview' | 'development' | 'unknown';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function envFlag(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && TRUE_VALUES.has(value.trim().toLowerCase()));
}

export function getGestionRuntimeEnvironment(): GestionRuntimeEnvironment {
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return vercelEnv;
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return 'development';
  }

  return 'unknown';
}

export function getDatabaseWriteBlock() {
  const environment = getGestionRuntimeEnvironment();

  if (environment === 'production') return null;
  if (envFlag('ALLOW_NON_PRODUCTION_WRITES')) return null;

  return {
    ok: false as const,
    error: 'NON_PRODUCTION_WRITE_BLOCKED',
    environment,
    message: 'Las escrituras están bloqueadas en este entorno. Configura un staging aislado y habilita ALLOW_NON_PRODUCTION_WRITES=true sólo allí.'
  };
}

export function getExternalSyncBlock() {
  const writeBlock = getDatabaseWriteBlock();
  if (writeBlock) return writeBlock;

  const environment = getGestionRuntimeEnvironment();
  if (environment === 'production') return null;
  if (envFlag('ALLOW_NON_PRODUCTION_EXTERNAL_SYNC')) return null;

  return {
    ok: false as const,
    error: 'NON_PRODUCTION_EXTERNAL_SYNC_BLOCKED',
    environment,
    message: 'La sincronización externa está bloqueada fuera de producción. Usa una planilla de prueba y habilita ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=true sólo en staging.'
  };
}
