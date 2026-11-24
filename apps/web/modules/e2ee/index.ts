export {
  encryptJsonPayload,
  decryptJsonPayload,
  buildAccountVaultSecret,
} from './crypto';
export type { EncryptedEnvelope } from './crypto';

export {
  pushEncryptedAccountProfile,
  pullAndDecryptAccountProfile,
  eraseEncryptedAccountProfile,
} from './sync';
export type { AccountVaultPayload, E2EESyncStatus } from './sync';
