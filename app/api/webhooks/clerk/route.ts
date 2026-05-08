import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
    const secret = process.env.CLERK_WEBHOOK_SECRET

    if (!secret) {
        return NextResponse.json({error: 'No webhook secret'}, {status: 500})
    }

    const payload = await req.text()
    const headers = {
        'svix-id': req.headers.get('svix-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? '',
    }

    let event: WebhookEvent
    try {
        event = new Webhook(secret).verify(payload, headers) as WebhookEvent
    } catch {
        return NextResponse.json({ error: 'Invalid signature'}, { status: 400 })
    }

    const { id, email_addresses, first_name, last_name } = event.data as any
    const email = email_addresses?.[0]?.email_address
    const name = `${first_name ?? ''} ${last_name ?? ''}`.trim()

    switch (event.type) {
        case 'user.created':
            if (!email) break
            await db.user.create({
                data: {
                    id, 
                    email,
                    name,
                },
            })
            break
        case 'user.updated':
            if (!email) break
            await db.user.update({
                where: { id },
                data: { 
                    email,
                    name,
                },
            })
            break
        case 'user.deleted':
            await db.user.delete({ where: { id }})
            break
    }

    return NextResponse.json({ received: true })
}