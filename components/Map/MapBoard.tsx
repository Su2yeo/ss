"use client";

import dynamic from "next/dynamic";

const MapBoardCanvas = dynamic(() => import("./MapBoardCanvas"), { ssr: false });

interface MapBoardProps {
  roomId: string;
  currentUser: { uid: string; displayName: string };
  isGM: boolean;
}

export default function MapBoard(props: MapBoardProps) {
  return <MapBoardCanvas {...props} />;
}