import { TokenWhitelabelApp } from "@dexkit/core/types";
import { Meta, StoryObj } from "@storybook/react";
import { atom } from "jotai";
import { DexkitProvider } from "../components";
import theme from "../theme";
import { AppNotification } from "../types";

function Component() {
  return (
    <DexkitProvider
      theme={theme}
      locale="en-US"
      assetsAtom={atom({})}
      currencyUserAtom={atom("")}
      tokensAtom={atom<TokenWhitelabelApp[]>([])}
      notificationTypes={{}}
      notificationsAtom={atom<AppNotification[]>([])}
      onChangeLocale={() => {}}
      transactionsAtom={atom<{}>({})}
      selectedWalletAtom={atom<string>("")}
    >
      <h1>hello</h1>
    </DexkitProvider>
  );
}

const meta: Meta<typeof Component> = {
  title: "Components/Magic",
  component: Component,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ["autodocs"],
  parameters: {
    // More on Story layout: https://storybook.js.org/docs/react/configure/story-layout
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {};
