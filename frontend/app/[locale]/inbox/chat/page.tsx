import { AppLayout } from "@/components/app-layout";
import { InboxProvider } from "../store/provider";
import ChatView from "./ChatView";

const ChatPage = () => {
  return (
    <AppLayout pageTitle="Входящие">
      <InboxProvider>
        <ChatView />
      </InboxProvider>
    </AppLayout>
  );
};

export default ChatPage;
