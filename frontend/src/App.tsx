import { messages } from '@/i18n/pt-BR'
import styles from './App.module.css'

function App() {
  return (
    <main className={styles.card}>
      <p className={styles.eyebrow}>{messages.appName}</p>
      <h1 className={styles.heading}>{messages.tagline}</h1>
      <p className={styles.supportingText}>{messages.foundationStatus}</p>
    </main>
  )
}

export default App
