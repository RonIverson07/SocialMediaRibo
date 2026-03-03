"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './integrations.module.css';
import { supabase } from '@/lib/supabase';

const INITIAL_INTEGRATIONS = [
    { id: 'fb_lead_ads', name: 'Facebook Lead Ads', status: 'Connected', lastEvent: '-', icon: 'FB' },
    { id: 'messenger', name: 'Facebook Messenger', status: 'Connected', lastEvent: '-', icon: 'MG' },
    { id: 'whatsapp', name: 'WhatsApp Business', status: 'Connected', lastEvent: '-', icon: 'WA' },
    { id: 'wordpress', name: 'WordPress Plugin', status: 'Connected', lastEvent: '-', icon: 'WP' },
];

function IntegrationsContent() {
    const searchParams = useSearchParams();
    const filter = searchParams.get('filter');
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState<{ show: boolean, id: string | null, type: 'connect' | 'disconnect' | null }>({
        show: false,
        id: null,
        type: null
    });

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch global integration statuses
                const { data: statusData, error: statusError } = await supabase
                    .from('integrations')
                    .select('*');

                if (statusError) throw statusError;

                // 2. Fetch last events for timestamps
                const { data: eventData } = await supabase
                    .from('lead_events')
                    .select('channel, created_at')
                    .order('created_at', { ascending: false });

                // 3. Map status data with event timestamps (Fallback to INITIAL if DB is empty)
                const baseIntegrations = statusData && statusData.length > 0 ? statusData : INITIAL_INTEGRATIONS;

                const final = baseIntegrations.map((integration: any) => {
                    const lastEvent = eventData?.find(e => e.channel === integration.id);
                    return {
                        ...integration,
                        lastEvent: lastEvent ? new Date(lastEvent.created_at).toLocaleString() : 'No events'
                    };
                });

                setIntegrations(final);
            } catch (err) {
                console.error('Error fetching integrations:', err);
                setIntegrations(INITIAL_INTEGRATIONS);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const updateStatus = async (id: string, isConnecting: boolean) => {
        const newStatus = isConnecting ? 'Connected' : 'Disconnected';

        // Find the full integration object to ensure we have required fields for upsert
        const integrationToUpdate = integrations.find(i => i.id === id);
        if (!integrationToUpdate) return;

        // Optimistic UI update
        const previousIntegrations = [...integrations];
        setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));

        try {
            const { error } = await supabase
                .from('integrations')
                .upsert({
                    id,
                    name: integrationToUpdate.name,
                    icon: integrationToUpdate.icon,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (err: any) {
            console.error('Failed to update database:', err.message || err);
            alert(`❌ Database Error: ${err.message || 'Unknown error'}\n\nReverting UI...`);
            setIntegrations(previousIntegrations);
        }
    };

    const handleToggleStatus = (id: string, currentStatus: string) => {
        const isConnecting = currentStatus !== 'Connected';
        setModalConfig({
            show: true,
            id,
            type: isConnecting ? 'connect' : 'disconnect'
        });
    };

    const confirmToggle = () => {
        if (modalConfig.id && modalConfig.type) {
            updateStatus(modalConfig.id, modalConfig.type === 'connect');
            setModalConfig({ show: false, id: null, type: null });
        }
    };

    const displayedIntegrations = filter === 'active'
        ? integrations.filter(i => i.status === 'Connected')
        : integrations;

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><h2>Syncing with database...</h2></div>;

    return (
        <div className={styles.grid}>
            {displayedIntegrations.map((integration: any) => (
                <div key={integration.id} className="ribo-card">
                    <div className={styles.cardHeader}>
                        <div className={styles.icon}>{integration.icon}</div>
                        <div className={styles.badge} data-status={integration.status?.toLowerCase()}>
                            {integration.status}
                        </div>
                    </div>
                    <h3 className={styles.cardTitle}>{integration.name}</h3>
                    <div className={styles.cardMeta}>
                        <span>Last inbound: {integration.lastEvent}</span>
                    </div>
                    <div className={styles.actions}>
                        {integration.status === 'Connected' ? (
                            <button
                                className="btn btn-secondary"
                                style={{ color: '#ef4444' }}
                                onClick={() => handleToggleStatus(integration.id, integration.status)}
                            >
                                Disconnect
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={() => handleToggleStatus(integration.id, integration.status)}
                            >
                                Connect
                            </button>
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

            {/* Professional Confirmation Modal */}
            {modalConfig.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div
                            className={styles.modalIcon}
                            style={{
                                background: modalConfig.type === 'connect' ? '#E6FAF2' : '#FEF2F2',
                                color: modalConfig.type === 'connect' ? '#059669' : '#DC2626'
                            }}
                        >
                            {modalConfig.type === 'connect' ? '🔌' : '⚠️'}
                        </div>
                        <h2>{modalConfig.type === 'connect' ? 'Connect' : 'Disconnect'} {modalConfig.id?.replace(/_/g, ' ').toUpperCase()}?</h2>
                        <p>
                            {modalConfig.type === 'connect'
                                ? `Are you sure you want to activate this channel? You will start receiving leads and processing data from this source.`
                                : `Are you sure you want to disconnect this channel? You will stop receiving and processing new leads from this source immediately.`
                            }
                        </p>
                        <div className={styles.modalActions}>
                            <button className="btn btn-secondary" onClick={() => setModalConfig({ show: false, id: null, type: null })}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                style={{ background: modalConfig.type === 'connect' ? 'var(--primary)' : '#DC2626' }}
                                onClick={confirmToggle}
                            >
                                {modalConfig.type === 'connect' ? 'Confirm Connection' : 'Confirm Disconnect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function IntegrationsDashboard() {
    return (
        <Suspense fallback={<div><p>Loading dashboard...</p></div>}>
            <IntegrationsContent />
        </Suspense>
    );
}
