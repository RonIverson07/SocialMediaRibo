"use client";

import React, { useState } from 'react';
import styles from './ai-settings.module.css';

export default function AISettingsPage() {
    const [showSuggestion, setShowSuggestion] = useState(40);
    const [autoApply, setAutoApply] = useState(85);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>AI Classification Settings</h1>
                    <p>Configure how AI processes and suggests lead stages.</p>
                </div>
                <button className="btn btn-primary">Save Settings</button>
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
                            <select className={styles.select}>
                                <option>Stage: Qualified</option>
                                <option>Stage: Discovery</option>
                            </select>
                        </div>
                        <div className={styles.mappingRow}>
                            <span>AI: "Urgent Inquiry"</span>
                            <strong>→</strong>
                            <select className={styles.select}>
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
                        <input type="checkbox" className={styles.toggle} />
                    </div>
                </section>
            </div>
        </div>
    );
}
