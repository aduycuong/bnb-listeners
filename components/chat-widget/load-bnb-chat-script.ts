import { BNB_CHAT_SCRIPT_URL } from "@/lib/chat-widget/constants";

import "./bnb-chat-types";

let loading: Promise<void> | null = null;

/** Loads the widget file once per page load; later calls reuse `window.BnbChat`. */
export function loadBnbChatScript(): Promise<void> {
  if (window.BnbChat) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = BNB_CHAT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Could not load the BNB chat widget."));
    };
    document.head.appendChild(script);
  });
  return loading;
}
