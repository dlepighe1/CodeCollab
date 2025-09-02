'use client';
import { useParams, useSearchParams } from "next/navigation";

export default function SessionPage () {
    const { sessionId } = useParams<{ sessionId: string }>()
    const sp = useSearchParams()
    const userName = sp.get('name') ?? 'Guest'

    return (
        <div>
            <h1>Welcome to the workstation </h1>
            <p>Session ID: {sessionId}</p>
            <p>User name : {userName} </p>
        </div>
    )
}