// workspace-lint: ignore — workspace resolved via requireWorkspace(); SQL uses kitsune schema column names.
import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/require-workspace';
import { getDodoClient } from '@/lib/dodo';
import { withAuth } from '@workos-inc/authkit-nextjs';

export async function POST(request: Request) {
  try {
    const ctx = await requireWorkspace();
    const client = getDodoClient();
    if (!client) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
    }

    const body = (await request.json()) as { productId?: string };
    const productId = body.productId ?? process.env.DODO_PRODUCT_ID;
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const { user } = await withAuth();
    const origin = new URL(request.url).origin;
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: user?.email ?? 'billing@kitsuneos.com',
        name: user?.firstName
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
          : 'KitsuneOS customer',
      },
      return_url: `${origin}/?checkout=success`,
      metadata: { kitsune_workspace: ctx.workspaceId },
    });

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
