import { ComponentMeta, ComponentStory } from "@storybook/react";
import { AppDialogTitle } from "../components/AppDialogTitle";
import AppTransactionWatchDialog from "../components/AppTransactionWatchDialog";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/AppTransactionWatchDialog",
  component: AppDialogTitle,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof AppDialogTitle>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof AppDialogTitle> = (args) => (
  <AppTransactionWatchDialog DialogProps={{ open: true }} transactions={[]} />
);

export const Default = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Default.args = {
  title: "App dialog",
};
