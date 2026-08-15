export const MOMO_PROVIDER = 'momo';
export const MOMO_CONFIG = Symbol('MOMO_CONFIG');
export const MOMO_HTTP_CLIENT = Symbol('MOMO_HTTP_CLIENT');
export const MOMO_CREATE_PATH = '/v2/gateway/api/create';
export const MOMO_CREATE_TIMEOUT_MS = 30_000;
export const MOMO_MIN_AMOUNT = 1_000;
export const MOMO_MAX_AMOUNT = 50_000_000;

export const MOMO_PENDING_RESULT_CODES = new Set([1000, 7000, 7002, 9000]);
export const MOMO_FINAL_FAILURE_RESULT_CODES = new Set([
  98, 99, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1017, 1026, 2019, 4001,
  4002, 4100,
]);
