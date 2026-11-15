import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminListPayments, adminRecordPayment, adminVoidPayment } from '@/lib/server/farm-api';
import { farmQuery, paymentInput, voidPaymentInput } from '@/lib/server/billing-schemas';

export const dynamic = 'force-dynamic';

// The database functions confirm the caller is a platform administrator.
export async function GET(request: Request) {
  return endpoint(async () => {
    const farmId = farmQuery.parse(new URL(request.url).searchParams.get('farmId'));
    const { db, user } = await signedIn();
    return json({ payments: await adminListPayments(db, user.id, farmId) });
  });
}

/** Records a payment received and moves the account's paid-until date forward. */
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { farmId, ...input } = paymentInput.parse(await body(request));
    return json({ payment: await adminRecordPayment(db, user.id, farmId, input) });
  });
}

/** Voids a payment that was entered wrongly (it stays listed, with the reason). */
export async function PATCH(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const input = voidPaymentInput.parse(await body(request));
    await adminVoidPayment(db, user.id, input.paymentId, input.reason);
    return json({ success: true });
  });
}
