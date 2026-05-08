import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Papa from 'papaparse'

export  async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const accountId = formData.get('accountId') as string

    const account = await db.account.findFirst({
        where: { id: accountId, userId },
    })

    if (!account) {
        return NextResponse.json({ error: 'Account not found '}, { status: 404})
    }

    const text = await file.text()
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })

    const transactions = (data as any[]).map((row) => ({
        accountId, 
        amount: parseFloat(row.amount),
        merchant: row.merchant ?? row.description ?? '',
        date: new Date(row.date),
        pending: false,
    }))

    await db.transaction.createMany({ data: transactions })

    return NextResponse.json({ imported: transactions.length })
}
