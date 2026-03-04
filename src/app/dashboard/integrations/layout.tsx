"use client";

import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './integrations.module.css';
import { supabase } from '@/lib/supabase';

function IntegrationsTabs() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const filter = searchParams.get('filter');

    const tabs = [
        {
            name: 'All Channels',
            href: '/dashboard/integrations',
            isActive: pathname === '/dashboard/integrations' && !filter
        },
        {
            name: 'Active',
            href: '/dashboard/integrations?filter=active',
            isActive: pathname === '/dashboard/integrations' && filter === 'active'
        },
        {
            name: 'Inbound Logs',
            href: '/dashboard/integrations/logs',
            isActive: pathname === '/dashboard/integrations/logs',
            className: styles.logTab
        },
    ];

    return (
        <div className={styles.tabs}>
            {tabs.map((tab) => (
                <Link
                    key={tab.name}
                    href={tab.href}
                    className={`${tab.className || ''} ${tab.isActive ? styles.activeTab : ''}`}
                >
                    {tab.name}
                </Link>
            ))}
        </div>
    );
}

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isMappingPage = pathname.includes('/mapping');
    const isFilteredLogs = pathname.includes('/logs') && searchParams.get('type');

    // Hide main dashboard header if we are in a sub-configuration page
    const hideHeader = isMappingPage || isFilteredLogs;

    const [showAddModal, setShowAddModal] = React.useState(false);
    const [addingId, setAddingId] = React.useState<string | null>(null);

    const availableChannels = [
        { id: 'insta', name: 'Instagram DM', icon: 'IG' },
        { id: 'linkedin', name: 'LinkedIn Leads', icon: 'LI' },
        { id: 'telegram', name: 'Telegram Bot', icon: 'TG' },
        { id: 'custom', name: 'Custom Webhook', icon: '{}' },
    ];

    const handleSelectChannel = async (channel: any) => {
        setAddingId(channel.id);
        try {
            const { error } = await supabase
                .from('integrations')
                .upsert({
                    id: channel.id,
                    name: channel.name,
                    icon: channel.icon,
                    status: 'Disconnected',
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setShowAddModal(false);
            window.location.reload(); // Refresh to see new channel in the grid
        } catch (err: any) {
            console.error('Failed to add channel:', err);
            alert(`Failed to add ${channel.name}: ${err.message || 'Unknown error'}`);
        } finally {
            setAddingId(null);
        }
    };

    const isLogsPage = pathname.includes('/integrations/logs');

    return (
        <div className={styles.container}>
            {!hideHeader && (
                <>
                    <header className={styles.header}>
                        <div>
                            <h1>Integrations Dashboard</h1>
                            <p>Connect and configure your omnichannel lead sources.</p>
                        </div>
                        {!isLogsPage && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAddModal(true)}
                            >
                                Add New Channel
                            </button>
                        )}
                    </header>

                    <Suspense fallback={<div className={styles.tabs}>Loading tabs...</div>}>
                        <IntegrationsTabs />
                    </Suspense>
                </>
            )}

            {children}

            {/* Selection Modal for New Channel */}
            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: '600px' }}>
                        <div className={styles.modalIcon} style={{ background: '#EEF2FF', color: 'var(--primary)' }}>
                            ✨
                        </div>
                        <h2>Add New Lead Source</h2>
                        <p>Select a platform to start receiving and classifying leads automatically.</p>

                        <div className={styles.channelSelectionGrid}>
                            {availableChannels.map(channel => (
                                <div
                                    key={channel.id}
                                    className={styles.selectableChannel}
                                    style={{ opacity: addingId === channel.id ? 0.6 : 1, pointerEvents: addingId ? 'none' : 'auto' }}
                                    onClick={() => handleSelectChannel(channel)}
                                >
                                    <div className={styles.channelIcon}>{channel.icon}</div>
                                    <span>{addingId === channel.id ? 'Adding...' : channel.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.modalActions} style={{ marginTop: '2rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={!!addingId}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
