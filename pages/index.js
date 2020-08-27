import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to HyperSigil!
        </h1>

        <p className={styles.description}>
          Currently in very early stage!
        </p>

        <div className={styles.grid}>
          <a href="/docs" className={styles.card}>
            <h3>Documentation &rarr;</h3>
            <p>Find in-depth information about HyperSigil features and API.</p>
          </a>

          <a href='/editor' className={styles.card}>
            <h3>Learn &rarr;</h3>
            <p>Learn about HyperSigil with a <i>demo</i> online editor.</p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        Contact me at&nbsp;
        <a href='mailto:hysie@pm.me'> hysie@pm.me</a>
      </footer>
    </div>
  )
}
