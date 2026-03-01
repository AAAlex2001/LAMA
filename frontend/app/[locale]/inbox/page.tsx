import { AppLayout } from "@/components/app-layout";
import InboxView from "@/app/[locale]/inbox/InboxView";

const InboxPage = async () => {
  return (
    <AppLayout pageTitle="Входящие">
      <InboxView />
    </AppLayout>
  )
}

export default InboxPage;