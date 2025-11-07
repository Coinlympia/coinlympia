import { useEffect, useState } from "react";

async function loadPlugin({ path }: { path: string }) {
  const plugin = await import("@dexkit/plugins/" + path);
  return plugin;
}

export default function LoadPlugin({
  path,
  data,
}: {
  path: string;
  data: unknown;
}) {
  const [pluginRender, setPluginRender] = useState<
    { render: ({ data }: { data: unknown }) => JSX.Element } | undefined
  >();
  useEffect(() => {
    if (path) {
      loadPlugin({ path }).then((pl) => setPluginRender(pl));
    }
  }, [path]);
  if (pluginRender) {
    return pluginRender.render({ data: data });
  } else {
    return <></>;
  }
}
