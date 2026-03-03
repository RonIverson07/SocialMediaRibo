"use client";

import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './integrations.module.css';

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
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Integrations Dashboard</h1>
                    <p>Connect and configure your omnichannel lead sources.</p>
                </div>
                <button className="btn btn-primary">Add New Channel</button>
            </header>

            <Suspense fallback={<div className={styles.tabs}>Loading tabs...</div>}>
                <IntegrationsTabs />
            </Suspense>

            {children}
        </div>
    );
}
