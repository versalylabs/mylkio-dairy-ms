import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserAccount } from '@/types';
import { ApiError } from './supabase';

export async function account(db: SupabaseClient, user: User): Promise<UserAccount> {
  const { error: setupError } = await db.rpc('provision_my_farm');
  if (setupError) throw new ApiError(503, 'Your farm account could not be prepared. Please contact support.');
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (error || !profile) throw new ApiError(503, 'Account information is unavailable.');
  const { data: memberships, error: membershipError } = await db.from('farm_memberships')
    .select('farm_id').eq('user_id', user.id).order('created_at').limit(1);
  if (membershipError) throw new ApiError(503, 'Farm information is unavailable.');
  const farmId = memberships?.[0]?.farm_id;
  const { data: subscription, error: subscriptionError } = farmId
    ? await db.from('subscriptions').select('details').eq('farm_id', farmId).single()
    : { data: null, error: null };
  if (subscriptionError) throw new ApiError(503, 'Subscription information is unavailable.');
  return {
    id: user.id, email: user.email || '', role: profile.role,
    farmId: farmId || '', name: profile.name, phone: profile.phone,
    createdAt: profile.created_at,
    subscription: subscription?.details || {
      plan: 'admin', status: 'active', monthlyPriceKsh: 0,
      startDate: profile.created_at, renewsAt: profile.created_at,
    },
  };
}
