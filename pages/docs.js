import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Docs() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <p className={styles.description}>
          Nothing to see here.
        </p>
      </main>

      <footer className={styles.footer}>
        Contact me at&nbsp;
        <a href='mailto:hysie@pm.me'> hysie@pm.me</a>
      </footer>
    </div>
  )
}
