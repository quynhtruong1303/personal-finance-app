import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, type } = await req.json()
    const account = await db.account.create({
        data: {
            userId,
            name,
            type,
            balance: 0.00,
        }
    })

    return NextResponse.json(account)
}