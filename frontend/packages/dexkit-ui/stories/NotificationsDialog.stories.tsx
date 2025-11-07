import type { Meta, StoryObj } from "@storybook/react";
import { IntlProvider } from "react-intl";
import NotificationsDialog from "../components/dialogs/NotificationsDialog";
import { COMMON_NOTIFICATION_TYPES } from "../constants/messages/common";

function Component() {
  const handleClear = () => {};

  return (
    <IntlProvider locale="en-US" defaultLocale="en-US">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />
      <NotificationsDialog
        transactions={
          {
            /*  ["testtx"]: {
            chainId: ChainId.Ethereum,
            status: TransactionStatus.Confirmed,
            created: new Date().getTime(),
          },*/
          }
        }
        DialogProps={{ open: true, maxWidth: "sm", fullWidth: true }}
        onClear={handleClear}
        notifications={[
          {
            icon: "send",
            type: "transaction",
            subtype: "approve",
            date: new Date().getTime(),
            values: {
              symbol: "USDT",
              name: "Tether",
            },
            metadata: { hash: "testtx" },
          },
          {
            type: "transaction",
            subtype: "approve",
            date: new Date().getTime(),
            values: {
              symbol: "USDT",
              name: "Tether",
            },
            metadata: { hash: "testtx" },
          },
        ]}
        notificationTypes={COMMON_NOTIFICATION_TYPES}
      />
    </IntlProvider>
  );
}

const meta: Meta<typeof Component> = {
  title: "Components/NotificationsDialog",
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
