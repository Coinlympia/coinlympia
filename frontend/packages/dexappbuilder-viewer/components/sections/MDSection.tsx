import { MarkdownEditorPageSection } from "@dexkit/ui/modules/wizard/types/section";
import { Container, useTheme } from "@mui/material";
import "@uiw/react-markdown-preview/markdown.css";
import "@uiw/react-md-editor/markdown-editor.css";

import MDEditor from "@uiw/react-md-editor";

interface Props {
  section: MarkdownEditorPageSection;
}

export default function MDSection({ section }: Props) {
  const theme = useTheme();

  return (
    <Container>
      <MDEditor.Markdown
        source={section.config?.source}
        style={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      />
    </Container>
  );
}
