import styles from './style.module.scss';
import DirectChat from "./components/DirectChat";
import DirectMenu from "./components/DirectMenu";

const InboxDirect = () => {
  return (
    <div className={styles.inboxDirect}>
      <DirectChat />
      <DirectMenu />
    </div>
  )
}

export default InboxDirect;