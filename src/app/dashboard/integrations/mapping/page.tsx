"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './mapping.module.css';
import { supabase } from '@/lib/supabase';

const CRM_FIELDS = [
    'Full Name', 'Email', 'Phone', 'Company', 'Website', 'Job Title', 'Source', 'Message'
];

const AI_LABELS = [
    'High Intent', 'Urgent Inquiry', 'Information Request', 'Spam/Bot', 'Customer Support'
];

const PIPELINE_STAGES = [
    { id: 'stage_discovery', name: 'Discovery' },
    { id: 'stage_negotiation', name: 'Negotiation' },
    { id: 'stage_closed_won', name: 'Closed Won' },
    { id: 'stage_closed_lost', name: 'Closed Lost' }
];

const INTEGRATION_NAMES: Record<string, string> = {
    'fb_lead_ads': 'Facebook Lead Ads',
    'messenger': 'Facebook Messenger',
    'whatsapp': 'WhatsApp Business',
    'wordpress': 'WordPress Plugin'
};

interface MappingRow {
    id?: string;
    external: string;
    crm: string;
}

interface StageMapping {
    ai_label: string;
    stage_id: string;
}

function MappingContent() {
    const searchParams = useSearchParams();
    const integrationId = searchParams.get('type') || 'fb_lead_ads';
    const displayName = INTEGRATION_NAMES[integrationId] || 'External Integration';

    const [mapping, setMapping] = useState<MappingRow[]>([]);
    const [stageMapping, setStageMapping] = useState<StageMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State for the "Add Row" at the bottom
    const [newExternal, setNewExternal] = useState('');
    const [newCrm, setNewCrm] = useState('');

    useEffect(() => {
        async function fetchMapping() {
            setLoading(true);

            // 1. Fetch Field Mapping
            const { data: fieldData } = await supabase
                .from('integration_mappings')
                .select('id, external_field, crm_field')
                .eq('integration_id', integrationId);

            if (fieldData && fieldData.length > 0) {
                setMapping(fieldData.map(row => ({
                    id: row.id,
                    external: row.external_field,
                    crm: row.crm_field
                })));
            } else {
                setMapping([
                    { external: 'full_name', crm: 'Full Name' },
                    { external: 'user_email', crm: 'Email' }
                ]);
            }

            // 2. Fetch Stage Mapping (Spec 2.2.C)
            const { data: stageData } = await supabase
                .from('integration_mappings')
                .select('external_field, crm_field')
                .eq('integration_id', `ai_stage_${integrationId}`);

            const initialStages = AI_LABELS.map(label => {
                const existing = stageData?.find(s => s.external_field === label);
                return {
                    ai_label: label,
                    stage_id: existing?.crm_field || 'stage_discovery'
                };
            });
            setStageMapping(initialStages);

            setLoading(false);
        }
        fetchMapping();
    }, [integrationId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Bulk upsert field mappings
            const fieldUpsert = mapping.map(row => ({
                integration_id: integrationId,
                external_field: row.external,
                crm_field: row.crm,
            }));

            // 2. Bulk upsert stage mappings (Spec 2.2.C)
            const stageUpsert = stageMapping.map(row => ({
                integration_id: `ai_stage_${integrationId}`,
                external_field: row.ai_label,
                crm_field: row.stage_id,
            }));

            // Delete old mappings and insert new ones
            await supabase.from('integration_mappings').delete().eq('integration_id', integrationId);
            await supabase.from('integration_mappings').delete().eq('integration_id', `ai_stage_${integrationId}`);

            const { error } = await supabase.from('integration_mappings').insert([...fieldUpsert, ...stageUpsert]);

            if (error) throw error;
            alert(`✅ Mapping for ${displayName} saved successfully!`);
        } catch (err) {
            console.error(err);
            alert('❌ Failed to save mapping.');
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = () => {
        if (!newExternal || !newCrm) {
            alert('Please enter both External and CRM field names.');
            return;
        }
        setMapping([...mapping, { external: newExternal, crm: newCrm }]);
        setNewExternal('');
        setNewCrm('');
    };

    const handleRemove = (index: number) => {
        const newMapping = mapping.filter((_, i) => i !== index);
        setMapping(newMapping);
    };

    const handleCRMChange = (index: number, val: string) => {
        const newMapping = [...mapping];
        newMapping[index].crm = val;
        setMapping(newMapping);
    };

    const handleTest = async () => {
        const testData = {
            submission_id: `test_${Math.random().toString(36).substr(2, 9)}`,
            form_id: `${integrationId}_test`,
            form_name: `${displayName} Test Form`,
            data: {
                full_name: "Test User",
                user_email: `${Math.random().toString(36).substring(7)}@test.com`,
                phone_number: "+63000000000",
                customer_query: `Testing ${displayName} integration mapping!`
            }
        };

        try {
            const res = await fetch('/api/inbound/wordpress/leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer RIBO_WP_TEST_KEY'
                },
                body: JSON.stringify(testData)
            });
            const result = await res.json();
            if (result.success) {
                alert(`🚀 Test Successful for ${displayName}!\nEvent processed via mapping simulation.`);
            } else {
                alert('Test failed: ' + result.error);
            }
        } catch (err) {
            alert('Connection failed.');
        }
    };

    if (loading) return <div className={styles.container}><p>Loading mapping config for {displayName}...</p></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Field Mapping: {displayName}</h1>
                    <p>Map external form fields from {displayName} to your CRM fields.</p>
                </div>
                <div className={styles.headerActions}>
                    <button className="btn btn-secondary" onClick={handleTest}>Test Connection</button>
                    <a href={`/dashboard/integrations/logs?type=${integrationId}`} className="btn btn-secondary">View Logs</a>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Mapping'}
                    </button>
                </div>
            </header>

            <div className="ribo-card" style={{ marginBottom: '3rem' }}>
                <h3 className={styles.sectionTitle}>Field Mapping</h3>
                <p className={styles.sectionMuted}>Link external keys from payloads to your CRM profile fields.</p>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>External Field (Source)</th>
                            <th>CRM Field (Destination)</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mapping.map((row, index) => (
                            <tr key={index}>
                                <td className={styles.externalCell}>{row.external}</td>
                                <td>
                                    <select
                                        className={styles.select}
                                        value={row.crm}
                                        onChange={(e) => handleCRMChange(index, e.target.value)}
                                    >
                                        {CRM_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={() => handleRemove(index)}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td>
                                <input
                                    type="text"
                                    placeholder="Add custom field..."
                                    className={styles.input}
                                    value={newExternal}
                                    onChange={(e) => setNewExternal(e.target.value)}
                                />
                            </td>
                            <td>
                                <select
                                    className={styles.select}
                                    value={newCrm}
                                    onChange={(e) => setNewCrm(e.target.value)}
                                >
                                    <option value="">Select CRM field...</option>
                                    {CRM_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </td>
                            <td>
                                <button className="btn btn-secondary" onClick={handleAdd}>Add Row</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="ribo-card">
                <h3 className={styles.sectionTitle}>AI Stage Mapping (Spec 2.2.C)</h3>
                <p className={styles.sectionMuted}>Map AI-detected intent labels to your pipeline process.</p>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>AI Output Label</th>
                            <th>Target Pipeline Stage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stageMapping.map((row, index) => (
                            <tr key={index}>
                                <td>{row.ai_label}</td>
                                <td>
                                    <select
                                        className={styles.select}
                                        value={row.stage_id}
                                        onChange={(e) => {
                                            const newS = [...stageMapping];
                                            newS[index].stage_id = e.target.value;
                                            setStageMapping(newS);
                                        }}
                                    >
                                        {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function FieldMappingPage() {
    return (
        <Suspense fallback={<div className={styles.container}><p>Loading...</p></div>}>
            <MappingContent />
        </Suspense>
    );
}
