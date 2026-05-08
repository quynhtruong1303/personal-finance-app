'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddAccountForm() {
    const [name, setName] = useState('')
    const [type, setType] = useState('checking')    // checking | savings | credit

    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ name, type }),
        })
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder='Account name' />
            <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value='checking'>Checking</option>
                <option value='savings'>Savings</option>
                <option value='credit'>Credit</option>
            </select>
            <button type='submit'>Add Account</button>
        </form>
    )
}