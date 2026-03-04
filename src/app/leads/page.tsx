"use client";

import React, { useEffect, useState } from 'react';
import styles from './leads-list.module.css';
import { supabase } from '@/lib/supabase';

export default function LeadsListPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        async function fetchLeads() {
            setLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    contacts (*)
                `)
                .order('created_at', { ascending: sortOrder === 'desc' ? false : true });

            if (error) {
                console.error('Error fetching leads:', error);
            } else {
                setLeads(data || []);
            }
            setLoading(false);
        }

        fetchLeads();
    }, [sortOrder]);

    // Filter leads based on search query
    const filteredLeads = leads.filter(lead => {
        const query = searchQuery.toLowerCase();
        const contact = lead.contacts;
        return (
            contact?.primary_email?.toLowerCase().includes(query) ||
            contact?.first_name?.toLowerCase().includes(query) ||
            contact?.last_name?.toLowerCase().includes(query) ||
            contact?.primary_phone_e164?.includes(query) ||
            lead.last_external_actor_id?.toLowerCase().includes(query)
        );
    });

    // Reset pagination when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Pagination logic
    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (loading) return <div className={styles.container}><p>Loading leads...</p></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Lead Pipeline</h1>
                    <p>Track all inbound leads from Facebook, WhatsApp, and WordPress.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    Refresh Data
                </button>
            </header>

            <div className={styles.searchBar}>
                <select
                    className={styles.sortSelect}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
                <div className={styles.searchInputWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

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
                        {paginatedLeads.map((lead) => (
                            <tr key={lead.id}>
                                <td>
                                    <div className={styles.contactInfo}>
                                        <strong>{lead.contacts?.primary_email || lead.contacts?.first_name || 'Unnamed'}</strong>
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
                        {paginatedLeads.length === 0 && (
                            <tr>
                                <td colSpan={5} className={styles.empty}>
                                    {searchQuery ? `No leads found matching "${searchQuery}"` : "No leads found yet. Try the \"Test Connection\" button!"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {filteredLeads.length > 0 && (
                    <div className={styles.pagination}>
                        <button
                            className={styles.paginationBtn}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <span className={styles.pageInfo}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className={styles.paginationBtn}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
