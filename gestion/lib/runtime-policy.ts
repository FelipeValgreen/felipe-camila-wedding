export type GestionRuntimeEnvironment = 'production' | 'preview' | 'development' | 'unknown';

export type RuntimeEnvInput = Record<string, string | undefined>;

export type RuntimePolicyBlock = {
  ok: false;
  error: 'NON_PRODUCTION_WRITE_BLOCKED' | 'NON_PRODUCTION_EXTERNAL_SYNC_BLOCKED';
  environment: GestionRuntimeEnvironment;
  message: string;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function envFlag(env: RuntimeEnvInput, name: string): boolean {
  const value = env[name];
  return Boolean(value && TRUE_VALUES.has(value.trim().toLowerCase()));
}

export function resolveGestionRuntimeEnvironment(env: RuntimeEnvInput): GestionRuntimeEnvironment {
  const vercelEnv = env.VERCEL_ENV;

  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return vercelEnv;
  }

  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    return 'development';
  }

  return 'unknown';
}

export function evaluateDatabaseWritePolicy(env: RuntimeEnvInput): RuntimePolicyBlock | null {
  const environment = resolveGestionRuntimeEnvironment(env);

  if (environment === 'production') return null;
  if (envFlag(env, 'ALLOW_NON_PRODUCTION_WRITES')) return null;

  return {
    ok: false,
    error: 'NON_PRODUCTION_WRITE_BLOCKED',
    environment,
    message: 'Las escrituras están bloqueadas en este entorno. Configura un staging aislado y habilita ALLOW_NON_PRODUCTION_WRITES=true sólo allí.'
  };
}

export function evaluateExternalSyncPolicy(env: RuntimeEnvInput): RuntimePolicyBlock | null {
  const writeBlock = evaluateDatabaseWritePolicy(env);
  if (writeBlock) return writeBlock;

  const environment = resolveGestionRuntimeEnvironment(env);
  if (environment === 'production') return null;
  if (envFlag(env, 'ALLOW_NON_PRODUCTION_EXTERNAL_SYNC')) return null;

  return {
    ok: false,
    error: 'NON_PRODUCTION_EXTERNAL_SYNC_BLOCKED',
    environment,
    message: 'La sincronización externa está bloqueada fuera de producción. Usa una planilla de prueba y habilita ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=true sólo en staging.'
  };
}
