export type GestionRuntimeEnvironment = 'production' | 'preview' | 'development' | 'unknown';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function parseBooleanFlag(value: string | null | undefined): boolean {
  return Boolean(value && TRUE_VALUES.has(value.trim().toLowerCase()));
}

export function resolveGestionRuntimeEnvironment(
  vercelEnv: string | null | undefined,
  nodeEnv: string | null | undefined
): GestionRuntimeEnvironment {
  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return vercelEnv;
  }

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return 'development';
  }

  return 'unknown';
}

export function isSafeHttpMethod(method: string): boolean {
  return SAFE_HTTP_METHODS.has(String(method || '').toUpperCase());
}

export function shouldBlockNonProductionApiWrite(input: {
  pathname: string;
  method: string;
  environment: GestionRuntimeEnvironment;
  allowNonProductionWrites?: string | null;
}): boolean {
  const { pathname, method, environment, allowNonProductionWrites } = input;

  if (!pathname.startsWith('/api/')) return false;
  if (isSafeHttpMethod(method)) return false;
  if (environment === 'production') return false;
  return !parseBooleanFlag(allowNonProductionWrites);
}

export function shouldBlockDatabaseWrite(input: {
  environment: GestionRuntimeEnvironment;
  allowNonProductionWrites?: string | null;
}): boolean {
  if (input.environment === 'production') return false;
  return !parseBooleanFlag(input.allowNonProductionWrites);
}

export function shouldBlockExternalSync(input: {
  environment: GestionRuntimeEnvironment;
  allowNonProductionWrites?: string | null;
  allowNonProductionExternalSync?: string | null;
}): boolean {
  if (shouldBlockDatabaseWrite(input)) return true;
  if (input.environment === 'production') return false;
  return !parseBooleanFlag(input.allowNonProductionExternalSync);
}
