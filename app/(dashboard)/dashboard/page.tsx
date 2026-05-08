import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import AddAccountForm from './AddAccountForm'
import CsvUploadForm from './CsvUploadForm'

export default async function DashboardPage() {
    const { userId } = await auth()

    if (!userId) redirect('/sign-in')
    
    const accounts = await db.account.findMany({
        where: { userId },
    })

    return (
        <div>
            <pre>{JSON.stringify(accounts, null, 2)}</pre>
            <AddAccountForm />
            <CsvUploadForm accounts={ accounts } />
        </div>
    )
}