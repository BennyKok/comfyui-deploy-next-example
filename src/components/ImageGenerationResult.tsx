"use client";
import { LoadingIcon } from "@/components/LoadingIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { checkStatus } from "@/server/generate";
import { useEffect, useState } from "react";

export function ImageGenerationResult({ runId }: { runId: string; }) {
  const [image, setImage] = useState("");
  const [status, setStatus] = useState<string>("preparing");
  const [loading, setLoading] = useState(true);

  // Polling in frontend to check for the
  useEffect(() => {
    if (!runId) return;
    const interval = setInterval(() => {
      checkStatus(runId).then((res) => {
        if (res) setStatus(res.status);
        if (res && res.status === "success") {
          console.log(res.outputs[0]?.data);
          setImage(res.outputs[0]?.data?.images[0].url);
          setLoading(false);
          clearInterval(interval);
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [runId]);

  return (
    <div className="border border-gray-200 w-full square w-full rounded-lg relative">
      {!loading && image && (
        <img
          className="w-full h-full object-contain"
          src={image}
          alt="Generated image"
        ></img>
      )}
      {!image && status && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center gap-2">
          {status} <LoadingIcon />
        </div>
      )}
      {loading && <Skeleton className="w-full h-full" />}
    </div>
  );
}
