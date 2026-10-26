import styles from '../../admin.module.css';

export default function SetsPlaceholder() {
  return (
    <>
      <div className={styles.head}><h1>Quiz sets</h1></div>
      <section className={styles.section}><p className={styles.note}>The set list and editor arrive in T4 to T6.</p></section>
    </>
  );
}
