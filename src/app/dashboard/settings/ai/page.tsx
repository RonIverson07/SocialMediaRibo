"use client";

import React, { useState, useEffect, Suspense } from 'react';
import styles from './ai-settings.module.css';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

const AI_LABELS = [
    'High Intent', 'Urgent Inquiry', 'Information Request', 'Spam/Bot', 'Customer Support'
];

const PIPELINE_STAGES = [
    { id: 'stage_discovery', name: 'Stage: Discovery' },
    { id: 'stage_negotiation', name: 'Stage: Negotiation' },
    { id: 'stage_qualified', name: 'Stage: Qualified' },
    { id: 'stage_high_priority', name: 'Stage: High Priority' },
    { id: 'stage_closed_won', name: 'Stage: Closed Won' },
    { id: 'stage_closed_lost', name: 'Stage: Closed Lost' }
];

interface StageMapping {
    ai_label: string;
    stage_id: string;
}

function AISettingsContent() {
    const searchParams = useSearchParams();
    const channel = searchParams.get('channel') || 'global';

    const [showSuggestion, setShowSuggestion] = useState(40);
    const [autoApply, setAutoApply] = useState(85);
    const [captureSnippet, setCaptureSnippet] = useState(false);
    const [stageMappings, setStageMappings] = useState<StageMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' }>({
        show: false,
        title: '',
        message: '',
        type: 'success'
    });

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            try {
                // 1. Fetch Thresholds
                const { data, error } = await supabase
                    .from('ai_settings')
                    .select('*')
                    .eq('channel', channel)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') throw error;

                if (data) {
                    setShowSuggestion(data.show_suggestion_threshold || 40);
                    setAutoApply(data.auto_apply_threshold || 85);
                    setCaptureSnippet(data.capture_message_snippet ?? false);
                } else if (channel !== 'global') {
                    const { data: globalData } = await supabase
                        .from('ai_settings')
                        .select('*')
                        .eq('channel', 'global')
                        .maybeSingle();

                    if (globalData) {
                        setShowSuggestion(globalData.show_suggestion_threshold || 40);
                        setAutoApply(globalData.auto_apply_threshold || 85);
                        setCaptureSnippet(globalData.capture_message_snippet ?? false);
                    }
                }

                // 2. Fetch Stage Mappings (Spec 2.2.C)
                const { data: stageData } = await supabase
                    .from('integration_mappings')
                    .select('external_field, crm_field')
                    .eq('integration_id', `ai_stage_${channel}`);

                const initialStages = AI_LABELS.map(label => {
                    const existing = stageData?.find(s => s.external_field === label);
                    return {
                        ai_label: label,
                        stage_id: existing?.crm_field || (label === 'High Intent' ? 'stage_qualified' : label === 'Urgent Inquiry' ? 'stage_high_priority' : 'stage_discovery')
                    };
                });
                setStageMappings(initialStages);

            } catch (err) {
                console.error('Error loading AI settings:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, [channel]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Update AI Settings Table
            const { error: settingsError } = await supabase
                .from('ai_settings')
                .upsert({
                    channel: channel,
                    show_suggestion_threshold: showSuggestion,
                    auto_apply_threshold: autoApply,
                    capture_message_snippet: captureSnippet,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'channel' });

            if (settingsError) throw settingsError;

            // 2. Update Stage Mappings (Spec 2.2.C)
            const stageUpsert = stageMappings.map(row => ({
                integration_id: `ai_stage_${channel}`,
                external_field: row.ai_label,
                crm_field: row.stage_id,
            }));

            await supabase.from('integration_mappings').delete().eq('integration_id', `ai_stage_${channel}`);
            const { error: mappingError } = await supabase.from('integration_mappings').insert(stageUpsert);
            if (mappingError) throw mappingError;

            setModal({
                show: true,
                title: 'Settings Saved',
                message: `AI configuration for ${channel.toUpperCase()} has been updated successfully.`,
                type: 'success'
            });
        } catch (err: any) {
            console.error('Failed to save settings:', err);
            setModal({
                show: true,
                title: 'Save Failed',
                message: `There was an error saving your changes: ${err.message || 'Unknown database error'}`,
                type: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.container}><p>Loading your AI configuration...</p></div>;

    const channelDisplay = channel === 'global' ? 'Global Default' : channel.toUpperCase().replace(/_/g, ' ');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <div className={styles.breadcrumb}>Settings • AI Classification</div>
                    <h1>AI Settings: {channelDisplay}</h1>
                    <p>Configure how AI processes and suggests lead stages for this channel.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </header>

            <div className={styles.grid}>
                <section className="ribo-card">
                    <h3>Confidence Thresholds</h3>
                    <p className={styles.description}>Determine when AI results are used in the system.</p>

                    <div className={styles.settingRow}>
                        <div className={styles.info}>
                            <strong>Show Suggestion</strong>
                            <span>Minimum confidence to show a suggestion in the timeline.</span>
                        </div>
                        <div className={styles.control}>
                            <input
                                type="range" min="0" max="100"
                                value={showSuggestion}
                                onChange={(e) => setShowSuggestion(parseInt(e.target.value))}
                            />
                            <span className={styles.value}>{showSuggestion}%</span>
                        </div>
                    </div>

                    <div className={styles.settingRow}>
                        <div className={styles.info}>
                            <strong>Auto-Apply Stage</strong>
                            <span>Confidence required to automatically update the lead stage.</span>
                        </div>
                        <div className={styles.control}>
                            <input
                                type="range" min="0" max="100"
                                value={autoApply}
                                onChange={(e) => setAutoApply(parseInt(e.target.value))}
                            />
                            <span className={styles.value}>{autoApply}%</span>
                        </div>
                    </div>
                </section>

                <section className="ribo-card">
                    <h3>Stage Mapping</h3>
                    <p className={styles.description}>Map AI classification labels to your CRM stages for {channelDisplay}.</p>

                    <div className={styles.mappingList}>
                        {stageMappings.map((row, index) => (
                            <div key={row.ai_label} className={styles.mappingRow}>
                                <span>AI: "{row.ai_label}"</span>
                                <strong>→</strong>
                                <select
                                    className={styles.select}
                                    value={row.stage_id}
                                    onChange={(e) => {
                                        const next = [...stageMappings];
                                        next[index].stage_id = e.target.value;
                                        setStageMappings(next);
                                    }}
                                >
                                    {PIPELINE_STAGES.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className={styles.infoMuted} style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
                        💡 Individual label-to-stage mapping can also be customized in the "Configure" Field Mapping screen.
                    </div>
                </section>

                <section className="ribo-card">
                    <h3>Data Retention & Privacy</h3>
                    <div className={styles.toggleRow}>
                        <div>
                            <strong>Capture Message Snippet</strong>
                            <p>Store a short text preview for AI context (Default: OFF)</p>
                        </div>
                        <input
                            type="checkbox"
                            className={styles.toggle}
                            checked={captureSnippet}
                            onChange={(e) => setCaptureSnippet(e.target.checked)}
                        />
                    </div>
                </section>
            </div>

            {/* Custom Professional Modal */}
            {modal.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div
                            className={styles.modalIcon}
                            style={{
                                background: modal.type === 'success' ? '#E6FAF2' : '#FEF2F2',
                                color: modal.type === 'success' ? '#059669' : '#DC2626'
                            }}
                        >
                            {modal.type === 'success' ? '✅' : '❌'}
                        </div>
                        <h2>{modal.title}</h2>
                        <p>{modal.message}</p>
                        <div className={styles.modalActions}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setModal({ ...modal, show: false })}
                                style={{ background: modal.type === 'success' ? 'var(--primary)' : '#DC2626' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AISettingsPage() {
    return (
        <Suspense fallback={<div className={styles.container}><p>Loading AI settings...</p></div>}>
            <AISettingsContent />
        </Suspense>
    );
}
