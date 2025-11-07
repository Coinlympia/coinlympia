import type { Meta, StoryObj } from "@storybook/react";
import WalletSection from "../components/sections/WalletSection";

const meta: Meta<typeof WalletSection> = {
  title: "Sections/WalletSection",
  component: WalletSection,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ["autodocs"],
  parameters: {
    // More on Story layout: https://storybook.js.org/docs/react/configure/story-layout
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof WalletSection>;

export const Default: Story = {};
