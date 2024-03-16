"use client";
import { LoadingIcon } from "@/components/LoadingIcon";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { checkStatus } from "@/server/generate";
import { useEffect, useState } from "react";

export function ImageGenerationResult({
  runId,
  className
}: { runId: string } & React.ComponentProps<"div">) {
  const [image, setImage] = useState("");
  const [status, setStatus] = useState<string>("preparing");
  const [progress, setProgress] = useState<number | undefined>();
  const [liveStatus, setLiveStatus] = useState<string | null>("");
  const [loading, setLoading] = useState(true);

  // Polling in frontend to check for the
  useEffect(() => {
    if (!runId) return;
    const interval = setInterval(() => {
      checkStatus(runId).then((res) => {
        if (res) {
          setStatus(res.status);
          setProgress(res.progress);
          setLiveStatus(res.live_status ?? null);
        }
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
    <div className={cn("border border-gray-200 w-full aspect-[512/768] rounded-lg relative", className)}>
      {!loading && image && (
        <img
          className="w-full h-full object-contain"
          src={image}
          alt="Generated image"
        ></img>
      )}
      {!image && status && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-2 px-4">
          <div className="flex items-center justify-center gap-2">
            {status} <LoadingIcon />
          </div>
          {progress != undefined && <Progress value={progress * 100} />}
          <span className="text-sm text-center"> {liveStatus != undefined && liveStatus}</span>
        </div>
      )}
      {loading && <Skeleton className="w-full h-full" />}
    </div>
  );
}
