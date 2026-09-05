import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export default function NotFound() {
  return (
    <PagePlaceholder eyebrow="404" title="This page is not on the menu.">
      <p>
        The link you followed has moved or never existed. Head back to the
        dining room, or reserve a table below.
      </p>
    </PagePlaceholder>
  );
}
