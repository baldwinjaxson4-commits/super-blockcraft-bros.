import { createFileRoute } from "@tanstack/react-router";
import Game from "@/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Super Block Bros — Blocky 3D Platformer" },
      {
        name: "description",
        content: "Run, jump and stomp through a blocky 3D world. Hit ? blocks, grab coins and reach the flag.",
      },
      { property: "og:title", content: "Super Block Bros — Blocky 3D Platformer" },
      {
        property: "og:description",
        content: "A Minecraft-style block world meets classic side-scrolling platforming.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
