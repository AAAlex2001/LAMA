import { AppLayout } from "@/components/app-layout";
import InboxView from "@/views/Inbox";

const InboxPage = async () => {
  return (
    <AppLayout pageTitle="Входящие">
      <InboxView />
    </AppLayout>
  )
}

export default InboxPage;