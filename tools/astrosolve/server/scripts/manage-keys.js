import { SqliteAccessKeyDao } from "../src/dao/sqlite-access-key.dao.js";
import {
  createKey,
  removeKey,
  rotateKey,
  listKeys,
} from "../src/services/access-key.service.js";
import { AccessKeyError } from "../src/models/errors.model.js";

const [, , command, username] = process.argv;

const accessKeyDao = SqliteAccessKeyDao.create();

try {
  switch (command) {
    case "add": {
      if (!username) {
        console.error("Usage: node scripts/manage-keys.js add <username>");
        process.exit(1);
      }
      const key = createKey(accessKeyDao, username);
      console.log(`Key created for "${username}":`);
      console.log(key);
      break;
    }
    case "remove": {
      if (!username) {
        console.error("Usage: node scripts/manage-keys.js remove <username>");
        process.exit(1);
      }
      removeKey(accessKeyDao, username);
      console.log(`Key deactivated for "${username}".`);
      break;
    }
    case "rotate": {
      if (!username) {
        console.error("Usage: node scripts/manage-keys.js rotate <username>");
        process.exit(1);
      }
      const key = rotateKey(accessKeyDao, username);
      console.log(`Key rotated for "${username}":`);
      console.log(key);
      console.log("");
      console.log(
        "The previous key is now invalid. Store this new key securely — it cannot be recovered.",
      );
      break;
    }
    case "list": {
      const keys = listKeys(accessKeyDao);
      if (keys.length === 0) {
        console.log("No access keys found.");
      } else {
        for (const k of keys) {
          const status = k.active ? "active" : "inactive";
          console.log(
            `${k.username}\t${k.created_at}\t${status}\t${k.use_count} use(s)`,
          );
        }
      }
      break;
    }
    default:
      console.error(
        "Usage: node scripts/manage-keys.js <add|remove|rotate|list> [username]",
      );
      process.exit(1);
  }
} catch (err) {
  if (err instanceof AccessKeyError) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error(`Unexpected error: ${err.message}`);
  }
  process.exit(1);
} finally {
  accessKeyDao.close();
}
