"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './logs.module.css';
import { supabase } from '@/lib/supabase';

function LogsContent() {
    const searchParams = useSearchParams();
    const filterChannel = searchParams.get('type');
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true);
            let query = supabase
                .from('lead_events')
                .select('*')
                .order('created_at', { ascending: false });

            if (filterChannel) {
                query = query.eq('channel', filterChannel);
            }

            const { data } = await query.limit(50);
            setEvents(data || []);
            setLoading(false);
        }
        fetchLogs();
    }, [filterChannel]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Inbound Logs</h1>
                <p>History of all events received from connected integrations.</p>
            </header>

            <div className="ribo-card">
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Time Received</th>
                            <th>Channel</th>
                            <th>Event Details</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                            <tr key={event.id}>
                                <td className={styles.time}>
                                    {new Date(event.created_at).toLocaleString()}
                                </td>
                                <td>
                                    <span className={styles.channelTag} data-channel={event.channel}>
                                        {event.channel.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.snippet}>
                                        {event.summary_text || event.snippet_text || 'No description available'}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.statusBadge}>PROCESSED</span>
                                </td>
                            </tr>
                        ))}
                        {events.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className={styles.empty}>
                                    No inbound logs found. {filterChannel ? `No logs for ${filterChannel}.` : ''}
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td colSpan={4} className={styles.empty}>Loading logs...</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function InboundLogsPage() {
    return (
        <Suspense fallback={<div className={styles.container}><p>Loading...</p></div>}>
            <LogsContent />
        </Suspense>
    );
}
