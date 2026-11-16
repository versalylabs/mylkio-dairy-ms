import 'server-only';
import { database } from './db';
import { getSiteContent } from './farm-api';
import { SUPPORT_EMAIL } from '../contact';
import { mergeSiteContent } from '../site-content';

/**
 * The support address the legal pages show: the one saved in Admin > Website, else the built-in one. If the
 * database cannot be reached the built-in address is used, so a legal page never fails to load.
 */
export async function currentSupportEmail(): Promise<string> {
  try {
    return mergeSiteContent(await getSiteContent(database())).contact.email;
  } catch {
    return SUPPORT_EMAIL;
  }
}
