import styles from "./page.module.css";
import Image from "next/image";

export default function Home() {
  return (
    <main className={`${styles.main} dots-bg`}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroText}>
          <span className={styles.badge}>Next Gen CRM Tracking</span>
          <h1 className="animate-up">Modern Managed Lead Solutions.</h1>
          <p className="animate-up" style={{ animationDelay: '0.1s' }}>
            Empower your sales pipeline with automated omnichannel lead capture and AI-driven behavior classification.
          </p>
          <div className={`${styles.heroActions} animate-up`} style={{ animationDelay: '0.2s' }}>
            <button className="btn btn-primary">Start Strategy Call</button>
            <button className="btn btn-secondary">Explore Features</button>
          </div>
        </div>
        <div className={styles.heroImageWrapper}>
          {/* Subtle geometric pattern overlay */}
          <div className={styles.heroGraphic}>
            <div className={styles.glassBox}>
              <div className={styles.indicatorActive}></div>
              <span>Lead Processor Active</span>
            </div>
            <div className={styles.gridPattern}></div>
            <div className={styles.accentCircle}></div>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className={styles.gridSection}>
        <div className={styles.sectionHeader}>
          <h2>Solutions for Growth</h2>
          <p>Every inbound channel produces a consistent, high-value "Lead Event".</p>
        </div>

        <div className={styles.grid}>
          <div className={`${styles.solutionCard} ribo-card animate-up`} style={{ animationDelay: '0.3s' }}>
            <div className={styles.iconBox}>📊</div>
            <h3>Inbound Dashboard</h3>
            <p>Connect and manage Facebook, WhatsApp, and WordPress channels in one place.</p>
            <a href="/dashboard/integrations" className={styles.learnMore}>Learn More →</a>
          </div>

          <div className={`${styles.solutionCard} ribo-card animate-up`} style={{ animationDelay: '0.4s' }}>
            <div className={styles.iconBox}>🧠</div>
            <h3>AI Behavior Metrics</h3>
            <p>Intent analysis and behavior signals to move leads through stages faster.</p>
            <a href="/dashboard/settings/ai" className={styles.learnMore}>Explore AI →</a>
          </div>

          <div className={`${styles.solutionCard} ribo-card animate-up`} style={{ animationDelay: '0.5s' }}>
            <div className={styles.iconBox}>⚡</div>
            <h3>Instant Tracking</h3>
            <p>Real-time lead events logged directly to the timeline without chat clutter.</p>
            <a href="/leads/123" className={styles.learnMore}>View Timeline →</a>
          </div>
        </div>
      </section>
    </main>
  );
}
