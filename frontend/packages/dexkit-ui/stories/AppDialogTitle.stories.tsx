import ReceiptIcon from "@mui/icons-material/Receipt";
import { Dialog, DialogContent, Divider, Typography } from "@mui/material";

import { AppDialogTitle } from "../components/AppDialogTitle";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof AppDialogTitle> = {
  title: "Components/AppDialogTitle",
  component: AppDialogTitle,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ["autodocs"],
  parameters: {
    // More on Story layout: https://storybook.js.org/docs/react/configure/story-layout
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof AppDialogTitle>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template = (args: any) => (
  <Dialog open={true} maxWidth="sm" fullWidth>
    <AppDialogTitle {...args} />
    <Divider />
    <DialogContent>
      <Typography>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate sed
        nihil rem asperiores aut veritatis quisquam, tempora provident. Rem modi
        sit saepe sequi magnam sapiente ducimus recusandae numquam nulla vitae!
      </Typography>
    </DialogContent>
  </Dialog>
);

export const Default: Story = {
  args: {
    title: "App dialog With Icon",
  },
  render: (args) => <Template {...args}></Template>,
};

export const WithIcon: Story = {
  args: {
    title: "App dialog With Icon",
    icon: <ReceiptIcon />,
  },
  render: (args) => <Template {...args}></Template>,
};
