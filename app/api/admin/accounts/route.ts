import { z } from 'zod';
import { adminAccess } from '@/lib/server/supabase';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export async function GET() {
  return endpoint(async () => {
    const { db } = await adminAccess();
    const { data, error } = await db.rpc('admin_list_accounts');
    if (error) throw error;
    return json({ accounts: data });
  });
}
export async function PATCH(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db } = await adminAccess();
    const input = z.object({ farmId: z.uuid(), plan: z.enum(['starter','farmer','farm_pro']), status: z.enum(['trial','active','past_due','cancelled']) }).strict().parse(await body(request));
    const { error } = await db.rpc('admin_update_subscription', { p_farm: input.farmId, p_plan: input.plan, p_status: input.status });
    if (error) throw error;
    return json({ success: true });
  });
}
