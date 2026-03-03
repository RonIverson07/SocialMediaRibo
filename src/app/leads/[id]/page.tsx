"use client";

import React, { useEffect, useState, use } from 'react';
import styles from './lead-details.module.css';
import { supabase } from '@/lib/supabase';

export default function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [lead, setLead] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ email: '', phone: '' });

    async function fetchData() {
        setLoading(true);
        const { data: leadData } = await supabase
            .from('leads')
            .select('*, contacts (*)')
            .eq('id', id)
            .single();

        if (leadData) {
            setLead(leadData);
            setEditForm({
                email: leadData.contacts?.primary_email || '',
                phone: leadData.contacts?.primary_phone_e164 || ''
            });
        }

        const { data: timelineData } = await supabase
            .from('activity_timeline')
            .select('*')
            .eq('lead_id', id)
            .order('created_at', { ascending: false });

        setTimeline(timelineData || []);
        setLoading(false);
    }

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const handleSaveLead = async () => {
        if (!lead?.contact_id) return;

        // 1. Update Contact
        const { error: contactError } = await supabase
            .from('contacts')
            .update({
                primary_email: editForm.email,
                primary_phone_e164: editForm.phone
            })
            .eq('id', lead.contact_id);

        if (contactError) {
            alert('Error updating contact');
            return;
        }

        // 2. Add Timeline Entry
        await supabase.from('activity_timeline').insert({
            lead_id: id,
            type: 'lead_updated',
            summary: `Contact information updated by user.`,
            actor: 'user'
        });

        setIsEditing(false);
        fetchData();
    };

    const handleConvert = async () => {
        if (!window.confirm('Are you sure you want to convert this lead to a Client?')) return;

        // 1. Update Lead Stage
        const { error: stageError } = await supabase
            .from('leads')
            .update({ pipeline_stage_id: 'stage_qualified', last_activity_at: new Date().toISOString() })
            .eq('id', id);

        if (stageError) {
            alert('Error converting lead');
            return;
        }

        // 2. Add Timeline Entry
        await supabase.from('activity_timeline').insert({
            lead_id: id,
            type: 'stage_change',
            summary: `Lead converted to Client/Qualified stage.`,
            actor: 'user'
        });

        alert('Lead successfully converted!');
        fetchData();
    };

    if (loading) return <div className={styles.container}><p>Loading lead data...</p></div>;
    if (!lead) return <div className={styles.container}><p>Lead not found.</p></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.profile}>
                    <div className={styles.avatar}>
                        {(lead.contacts?.primary_email || 'L').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1>{lead.contacts?.primary_email || 'Unnamed Lead'}</h1>
                        <div className={styles.contactDetails}>
                            <span>📧 {lead.contacts?.primary_email}</span>
                            {lead.contacts?.primary_phone_e164 && <span>📞 {lead.contacts?.primary_phone_e164}</span>}
                            {lead.contacts?.facebook_psid && <span title="Messenger PSID">💬 FB: {lead.contacts.facebook_psid.substring(0, 8)}...</span>}
                            {lead.contacts?.whatsapp_phone_e164 && <span title="WhatsApp">📱 WA: {lead.contacts.whatsapp_phone_e164}</span>}
                        </div>
                    </div>
                </div>
                <div className={styles.badge}>{lead.pipeline_stage_id.replace('stage_', '').toUpperCase()}</div>
            </header>

            <div className={styles.mainGrid}>
                <section className={styles.timelineSection}>
                    <h2>Activity Timeline</h2>
                    <div className={styles.timeline}>
                        {timeline.map((event: any) => {
                            const isAI = event.type === 'ai_suggestion' || event.metadata_json?.confidence;
                            const isLeadEvent = event.type === 'lead_event';
                            const source = event.metadata_json?.source || lead.lead_source;

                            return (
                                <div key={event.id} className={styles.timelineItem} data-type={event.type}>
                                    <div className={styles.timelineDot}>
                                        {isLeadEvent && (
                                            <span className={styles.sourceIcon}>
                                                {source === 'whatsapp' ? '📱' : source === 'messenger' ? '💬' : '📊'}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.timelineContent}>
                                        <div className={styles.eventHeader}>
                                            <strong>
                                                {isLeadEvent ? `INBOUND: ${source.toUpperCase()}` : event.type.replace('_', ' ').toUpperCase()}
                                            </strong>
                                            <span className={styles.time}>
                                                {new Date(event.created_at).toLocaleString()}
                                            </span>
                                        </div>

                                        {event.summary && <p className={styles.summary}>{event.summary}</p>}

                                        {event.metadata_json?.confidence && (
                                            <div className={`${styles.aiResult} ${event.metadata_json.confidence > 80 ? styles.aiHighConf : ''}`}>
                                                <div className={styles.aiHeader}>
                                                    <span className={styles.aiBadge}>AI SIGNAL</span>
                                                    <span className={styles.confidenceText}>{event.metadata_json.confidence}% Confidence</span>
                                                </div>
                                                <div className={styles.confidenceBar}>
                                                    <div
                                                        className={styles.confidenceProgress}
                                                        style={{
                                                            width: `${event.metadata_json.confidence}%`,
                                                            background: event.metadata_json.confidence > 80 ? '#059669' : '#0010B3'
                                                        }}
                                                    ></div>
                                                </div>
                                                <ul className={styles.reasons}>
                                                    {event.metadata_json.reasons?.map((r: string, i: number) => <li key={i}>• {r}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {timeline.length === 0 && <p className={styles.muted}>No activity recorded yet.</p>}
                    </div>
                </section>

                <aside className={styles.sidebar}>
                    <div className="ribo-card">
                        <h3>Lead Information</h3>
                        <div className={styles.infoRow}>
                            <span>Source</span>
                            <strong>{lead.lead_source?.toUpperCase()}</strong>
                        </div>
                        <div className={styles.infoRow}>
                            <span>Stage</span>
                            <strong>{lead.pipeline_stage_id.replace('stage_', '').toUpperCase()}</strong>
                        </div>
                        <div className={styles.infoRow}>
                            <span>Created At</span>
                            <strong>{new Date(lead.created_at).toLocaleDateString()}</strong>
                        </div>
                        <hr className={styles.divider} />
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginBottom: '0.75rem' }}
                            onClick={() => setIsEditing(true)}
                        >
                            Edit Lead
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            onClick={handleConvert}
                        >
                            Convert to Client
                        </button>
                    </div>
                </aside>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2>Edit Lead</h2>
                        <div className={styles.formGroup}>
                            <label>Primary Email</label>
                            <input
                                type="email"
                                className={styles.input}
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Primary Phone</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveLead}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
