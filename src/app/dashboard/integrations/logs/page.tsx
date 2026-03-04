"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './logs.module.css';
import { supabase } from '@/lib/supabase';

const INTEGRATION_NAMES: Record<string, string> = {
    'fb_lead_ads': 'Facebook Lead Ads',
    'messenger': 'Facebook Messenger',
    'whatsapp': 'WhatsApp Business',
    'wordpress': 'WordPress Plugin',
    'insta': 'Instagram DM',
    'linkedin': 'LinkedIn Leads',
    'telegram': 'Telegram Bot',
    'custom': 'Custom Webhook'
};

function LogsContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true);
            let query = supabase
                .from('lead_events')
                .select('*, contacts(primary_email)')
                .order('received_at', { ascending: sortOrder === 'asc' });

            if (type) {
                query = query.eq('channel', type);
            }

            const { data } = await query;
            setLogs(data || []);
            setLoading(false);
        }
        fetchLogs();
    }, [type, sortOrder]);

    // Reset pagination on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const filteredLogs = logs.filter(log => {
        const query = searchQuery.toLowerCase();
        return (
            log.summary_text?.toLowerCase().includes(query) ||
            log.contacts?.primary_email?.toLowerCase().includes(query) ||
            log.external_actor_key?.toLowerCase().includes(query)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (loading) return <div className={styles.container}><p>Loading audit logs...</p></div>;

    const channelName = type ? (INTEGRATION_NAMES[type] || type.toUpperCase()) : 'All Channels';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>{type ? `${channelName} Logs` : 'Integration Inbound Logs'}</h1>
                    <p>Audit trail of raw inbound events received via {channelName.toLowerCase()}.</p>
                </div>
            </header>

            <div className={styles.searchBar}>
                <select
                    className={styles.sortSelect}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
                <div className={styles.searchInputWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="ribo-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Received At</th>
                            {!type && <th>Channel</th>}
                            <th>Lead/Contact</th>
                            <th>Summary</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLogs.map((log) => (
                            <tr key={log.id}>
                                <td className={styles.time}>{new Date(log.received_at).toLocaleString()}</td>
                                {!type && (
                                    <td>
                                        <span className={styles.channelBadge} data-source={log.channel}>
                                            {log.channel.toUpperCase()}
                                        </span>
                                    </td>
                                )}
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
                {paginatedLogs.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                        {searchQuery ? `No logs found matching "${searchQuery}"` : "No inbound events recorded for this channel yet."}
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredLogs.length > 0 && (
                    <div className={styles.pagination} style={{ padding: '1.5rem', borderTop: '1px solid #eee' }}>
                        <button
                            className={styles.paginationBtn}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <span className={styles.pageInfo}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className={styles.paginationBtn}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
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
