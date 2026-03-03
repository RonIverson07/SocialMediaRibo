"use client";

import React, { useEffect, useState } from 'react';
import styles from './integrations.module.css';
import { supabase } from '@/lib/supabase';

const INITIAL_INTEGRATIONS = [
    { id: 'fb_lead_ads', name: 'Facebook Lead Ads', status: 'Connected', lastEvent: '-', icon: 'FB' },
    { id: 'messenger', name: 'Facebook Messenger', status: 'Connected', lastEvent: '-', icon: 'MG' },
    { id: 'whatsapp', name: 'WhatsApp Business', status: 'Connected', lastEvent: '-', icon: 'WA' },
    { id: 'wordpress', name: 'WordPress Plugin', status: 'Connected', lastEvent: '-', icon: 'WP' },
];

export default function IntegrationsDashboard() {
    const [activeTab, setActiveTab] = useState('all');
    const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);

    useEffect(() => {
        async function fetchLastEvents() {
            const { data } = await supabase
                .from('lead_events')
                .select('channel, created_at')
                .order('created_at', { ascending: false });

            if (data) {
                const updated = INITIAL_INTEGRATIONS.map(integration => {
                    const lastEvent = data.find(e => e.channel === integration.id);
                    return {
                        ...integration,
                        lastEvent: lastEvent ? new Date(lastEvent.created_at).toLocaleString() : 'No events'
                    };
                });
                setIntegrations(updated);
            }
        }
        fetchLastEvents();
    }, []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Integrations Dashboard</h1>
                    <p>Connect and configure your omnichannel lead sources.</p>
                </div>
                <button className="btn btn-primary">Add New Channel</button>
            </header>

            <div className={styles.tabs}>
                <button
                    className={activeTab === 'all' ? styles.activeTab : ''}
                    onClick={() => setActiveTab('all')}
                >
                    All Channels
                </button>
                <button
                    className={activeTab === 'active' ? styles.activeTab : ''}
                    onClick={() => setActiveTab('active')}
                >
                    Active
                </button>
                <a
                    href="/dashboard/integrations/logs"
                    className={activeTab === 'logs' ? styles.activeTab : ''}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                >
                    Inbound Logs
                </a>
            </div>

            <div className={styles.grid}>
                {integrations.map((integration: any) => (
                    <div key={integration.id} className="ribo-card">
                        <div className={styles.cardHeader}>
                            <div className={styles.icon}>{integration.icon}</div>
                            <div className={styles.badge} data-status={integration.status.toLowerCase()}>
                                {integration.status}
                            </div>
                        </div>
                        <h3 className={styles.cardTitle}>{integration.name}</h3>
                        <div className={styles.cardMeta}>
                            <span>Last inbound: {integration.lastEvent}</span>
                        </div>
                        <div className={styles.actions}>
                            {integration.status === 'Connected' ? (
                                <button className="btn btn-secondary" style={{ color: '#ef4444' }}>Disconnect</button>
                            ) : (
                                <button className="btn btn-primary">Connect</button>
                            )}
                            <a href={`/dashboard/integrations/mapping?type=${integration.id}`} className="btn btn-secondary">Configure</a>
                        </div>
                        <div className={styles.secondaryActions}>
                            <a href="/dashboard/settings/ai">AI Settings</a>
                            <span>•</span>
                            <a href={`/dashboard/integrations/logs?type=${integration.id}`}>View Logs</a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
