export type LangChainStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "activity";
      status: "running" | "complete";
      title: string;
      detail?: string;
    };
