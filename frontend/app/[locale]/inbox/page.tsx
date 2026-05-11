import { AppLayout } from "@/components/app-layout";
import InboxView from "@/[locale]/inbox/InboxView";
import { InboxProvider } from "./store/provider";

const InboxPage = () => {
  return (
    <AppLayout pageTitle="Входящие">
      <InboxProvider>
        <InboxView />
      </InboxProvider>
    </AppLayout>
  )
}

export default InboxPage;