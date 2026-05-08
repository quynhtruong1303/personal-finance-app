'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Account = {
    id: string
    name: string
    type: string
}

export default function CsvUploadForm({ accounts } : { accounts: Account[] }) {
    const [file, setFile] = useState<File | null>(null)
    const [accountId, setAccountId] = useState(accounts[0]?.id ?? '' )
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)
        formData.append('accountId', accountId)

        await fetch('/api/transactions/import', {
            method: 'POST',
            body: formData,
        })

        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit}>
            <input type='file' accept='.csv' onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                    </option>
                ))}
            </select>
            <button type='submit'>Upload</button>
        </form>
    )
}