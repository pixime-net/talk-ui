import { ChatView } from "./components/ChatView";
import { ChatUIProvider } from "./context/ChatUIContext";

export function App() {
  return (
    <ChatUIProvider>
      <ChatView />
    </ChatUIProvider>
  );
}
