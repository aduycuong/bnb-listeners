export type BnbChatInstance = {
  open: () => void;
  close: () => void;
  sendMessage: (text: string) => Promise<unknown>;
};

export type BnbChatInitOptions = {
  publicKey: string;
  baseUrl: string;
  name?: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
};

declare global {
  interface Window {
    BnbChat?: { init: (options: BnbChatInitOptions) => BnbChatInstance };
  }
}
