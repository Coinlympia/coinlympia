import { CustomEditorSection } from "@dexkit/ui/modules/wizard/types/section";
import PageEditor from "../page-editor/PageEditor";

interface Props {
  section: CustomEditorSection;
}

export function CustomSection({ section }: Props) {
  return <PageEditor readOnly={true} value={section.data} />;
}

export default CustomSection;
