export type SlideAction = {
  caption: React.ReactNode;
};

export type SlideActionLinkAction = SlideAction & {
  type: "link";
  url: string;
};

export type SlideActionType = SlideActionLinkAction;
