import { useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { youTubeUrlToEmbed } from "../utils/youtube";

interface Props {
  url?: string;
  title?: string;
}

const LazyYoutubeFrame = ({ url, title }: Props) => {
  const { ref, inView } = useInView({ triggerOnce: true });

  const videoUrl = useMemo(() => {
    if (!url) {
      return;
    }

    return youTubeUrlToEmbed(url);
  }, [url]);

  return (
    <div ref={ref}>
      {inView && (
        <iframe
          title={title}
          src={videoUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          width="100%"
          height="315"
        ></iframe>
      )}
    </div>
  );
};

export default LazyYoutubeFrame;
