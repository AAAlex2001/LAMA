import styles from './style.module.scss';
import DirectChat from "./components/DirectChat";
import DirectMenu from "./components/DirectMenu";

const InboxDirect = () => {
  return (
    <div className={styles.inboxDirect}>
      <DirectChat />
      <div className={styles.directMenuWrapper}>
        <DirectMenu />
      </div>
    </div>
  )
}

export default InboxDirect;