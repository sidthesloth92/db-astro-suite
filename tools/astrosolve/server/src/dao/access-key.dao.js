/**
 * Abstract base DAO for access key operations.
 * Concrete implementations (e.g. SqliteAccessKeyDao) must override all methods.
 */
export class AccessKeyDao {
  /**
   * Inserts a new access key record.
   *
   * @param {string} username
   * @param {string} keyHash - SHA-256 hex digest of the plain-text key
   * @returns {void}
   * @throws {AccessKeyError} If the username already exists
   */
  // eslint-disable-next-line no-unused-vars
  insertAccessKey(username, keyHash) {
    throw new Error("Not implemented");
  }

  /**
   * Deactivates the key for the given username (sets active = 0).
   *
   * @param {string} username
   * @returns {void}
   * @throws {AccessKeyError} If the username is not found
   */
  // eslint-disable-next-line no-unused-vars
  deactivateAccessKey(username) {
    throw new Error("Not implemented");
  }

  /**
   * Returns all key records (without hashes).
   *
   * @returns {{ username: string, created_at: string, active: number, use_count: number }[]}
   */
  listAccessKeys() {
    throw new Error("Not implemented");
  }

  /**
   * Finds an active key record by its SHA-256 hash.
   * Returns the row id on match, or null if not found or inactive.
   *
   * @param {string} keyHash - SHA-256 hex digest
   * @returns {number | null} Row id if a matching active key exists, null otherwise
   */
  // eslint-disable-next-line no-unused-vars
  findActiveKeyByHash(keyHash) {
    throw new Error("Not implemented");
  }

  /**
   * Atomically increments the use_count for the key with the given row id.
   *
   * @param {number} id - The row id of the access key record
   * @returns {void}
   */
  // eslint-disable-next-line no-unused-vars
  incrementKeyUseCount(id) {
    throw new Error("Not implemented");
  }
}
