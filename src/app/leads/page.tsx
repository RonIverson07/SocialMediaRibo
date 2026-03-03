"use client";

import React, { useEffect, useState } from 'react';
import styles from './leads-list.module.css';
import { supabase } from '@/lib/supabase';

export default function LeadsListPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeads() {
            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    contacts (*)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching leads:', error);
            } else {
                setLeads(data || []);
            }
            setLoading(false);
        }

        fetchLeads();
    }, []);

    if (loading) return <div className={styles.container}><p>Loading leads...</p></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Lead Pipeline</h1>
                    <p>Track all inbound leads from Facebook, WhatsApp, and WordPress.</p>
                </div>
                <button className="btn btn-primary">Refresh Data</button>
            </header>

            <div className={styles.card}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Contact</th>
                            <th>Source</th>
                            <th>Stage</th>
                            <th>Last Activity</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map((lead) => (
                            <tr key={lead.id}>
                                <td>
                                    <div className={styles.contactInfo}>
                                        <strong>{lead.contacts?.primary_email || 'Unnamed'}</strong>
                                        <span>{lead.contacts?.primary_phone_e164 || ''}</span>
                                    </div>
                                </td>
                                <td><span className={styles.sourceTag}>{lead.lead_source?.toUpperCase()}</span></td>
                                <td>
                                    <span className={styles.stageIndicator} data-stage={lead.pipeline_stage_id}>
                                        {lead.pipeline_stage_id.replace('stage_', '').toUpperCase()}
                                    </span>
                                </td>
                                <td>{new Date(lead.last_activity_at).toLocaleString()}</td>
                                <td>
                                    <a href={`/leads/${lead.id}`} className="btn btn-secondary">View Timeline</a>
                                </td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={5} className={styles.empty}>No leads found yet. Try the "Test Connection" button!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
