"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './logs.module.css';
import { supabase } from '@/lib/supabase';

function LogsContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true);
            let query = supabase
                .from('lead_events')
                .select('*, contacts(primary_email)')
                .order('received_at', { ascending: false })
                .limit(50);

            if (type) {
                query = query.eq('channel', type);
            }

            const { data } = await query;
            setLogs(data || []);
            setLoading(false);
        }
        fetchLogs();
    }, [type]);

    if (loading) return <div className={styles.container}><p>Loading audit logs...</p></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Integration Inbound Logs</h1>
                    <p>Audit trail of all raw inbound events and payloads received via {type || 'all channels'}.</p>
                </div>
            </header>

            <div className="ribo-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Received At</th>
                            <th>Channel</th>
                            <th>Lead/Contact</th>
                            <th>Summary</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className={styles.time}>{new Date(log.received_at).toLocaleString()}</td>
                                <td>
                                    <span className={styles.channelBadge} data-source={log.channel}>
                                        {log.channel.toUpperCase()}
                                    </span>
                                </td>
                                <td className={styles.leadCell}>
                                    {log.contacts?.primary_email || 'New Connection'}
                                    <span className={styles.psid}>{log.external_actor_key}</span>
                                </td>
                                <td className={styles.summaryCell}>{log.summary_text}</td>
                                <td>
                                    <span className={styles.statusBadge}>SUCCESS</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                        No inbound events recorded for this channel yet.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div>Loading logs...</div>}>
            <LogsContent />
        </Suspense>
    );
}
