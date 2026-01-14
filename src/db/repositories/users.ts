import { query, queryOne } from '../index';

export interface UserMapping {
  id: number;
  github_username: string;
  telegram_user_id: number | null;
  telegram_username: string | null;
  is_whitelisted: boolean;
  created_at: Date;
}

export async function getUserMapping(
  githubUsername: string
): Promise<UserMapping | null> {
  return queryOne<UserMapping>(
    'SELECT * FROM user_mappings WHERE github_username = $1',
    [githubUsername]
  );
}

export async function getUserMappingByTelegramId(
  telegramUserId: number
): Promise<UserMapping | null> {
  return queryOne<UserMapping>(
    'SELECT * FROM user_mappings WHERE telegram_user_id = $1',
    [telegramUserId]
  );
}

export async function createOrUpdateUserMapping(
  githubUsername: string,
  telegramUserId: number | null,
  telegramUsername: string | null
): Promise<UserMapping> {
  const result = await query<UserMapping>(
    `INSERT INTO user_mappings (github_username, telegram_user_id, telegram_username)
     VALUES ($1, $2, $3)
     ON CONFLICT (github_username) 
     DO UPDATE SET 
       telegram_user_id = EXCLUDED.telegram_user_id,
       telegram_username = EXCLUDED.telegram_username
     RETURNING *`,
    [githubUsername, telegramUserId, telegramUsername]
  );
  return result[0];
}

export async function setWhitelistStatus(
  githubUsername: string,
  isWhitelisted: boolean
): Promise<UserMapping | null> {
  const result = await query<UserMapping>(
    `UPDATE user_mappings 
     SET is_whitelisted = $1 
     WHERE github_username = $2
     RETURNING *`,
    [isWhitelisted, githubUsername]
  );
  return result.length > 0 ? result[0] : null;
}

export async function getWhitelistedUsers(): Promise<UserMapping[]> {
  return query<UserMapping>(
    'SELECT * FROM user_mappings WHERE is_whitelisted = true'
  );
}

export async function getAllUserMappings(): Promise<UserMapping[]> {
  return query<UserMapping>('SELECT * FROM user_mappings ORDER BY github_username');
}
