"use client";

import React, { useState, useEffect } from 'react';
import styles from './ai-settings.module.css';
import { supabase } from '@/lib/supabase';

export default function AISettingsPage() {
    const [showSuggestion, setShowSuggestion] = useState(40);
    const [autoApply, setAutoApply] = useState(85);
    const [captureSnippet, setCaptureSnippet] = useState(false);
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
                const { data, error } = await supabase
                    .from('ai_settings')
                    .select('*')
                    .eq('id', 'default')
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (data) {
                    setShowSuggestion(data.show_suggestion_threshold);
                    setAutoApply(data.auto_apply_threshold);
                    setCaptureSnippet(data.capture_message_snippet);
                }
            } catch (err) {
                console.error('Error loading AI settings:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('ai_settings')
                .upsert({
                    id: 'default',
                    show_suggestion_threshold: showSuggestion,
                    auto_apply_threshold: autoApply,
                    capture_message_snippet: captureSnippet,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setModal({
                show: true,
                title: 'Settings Saved',
                message: 'Your AI classification thresholds and privacy settings have been updated successfully.',
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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>AI Classification Settings</h1>
                    <p>Configure how AI processes and suggests lead stages.</p>
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
                    <p className={styles.description}>Map AI classification labels to your CRM stages.</p>

                    <div className={styles.mappingList}>
                        <div className={styles.mappingRow}>
                            <span>AI: "Qualified"</span>
                            <strong>→</strong>
                            <select className={styles.select} defaultValue="Stage: Qualified">
                                <option>Stage: Qualified</option>
                                <option>Stage: Discovery</option>
                            </select>
                        </div>
                        <div className={styles.mappingRow}>
                            <span>AI: "Urgent Inquiry"</span>
                            <strong>→</strong>
                            <select className={styles.select} defaultValue="Stage: High Priority">
                                <option>Stage: High Priority</option>
                                <option>Stage: Qualified</option>
                            </select>
                        </div>
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
