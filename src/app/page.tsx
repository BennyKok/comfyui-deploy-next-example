"use client";

import { LoadingIcon } from "@/components/LoadingIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { checkStatus, generate } from "@/server/generate";
import { useEffect, useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState("preparing");

  // Polling in frontend to check for the
  useEffect(() => {
    if (!runId) return;
    const interval = setInterval(() => {
      checkStatus(runId).then((res) => {
        if (res) setStatus(res.status);
        if (res && res.status === "success") {
          console.log(res.outputs[0].data);
          setImage(res.outputs[0].data.images[0].url);
          setLoading(false);
          clearInterval(interval);
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [runId]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Card className="w-full max-w-[500px]">
        <CardHeader>
          Comfy Deploy - Vector Line Art Tool
          <div className="text-xs text-foreground opacity-50">
            Lora -{" "}
            <a href="https://civitai.com/models/256144/stick-line-vector-illustration">
              stick-line-vector-illustration
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid w-full items-center gap-1.5"
            onSubmit={(e) => {
              if (loading) return;

              e.preventDefault();
              setLoading(true);
              generate(prompt).then((res) => {
                console.log(res);
                if (!res) return;
                setRunId(res.run_id);
              });
              setStatus("preparing");
            }}
          >
            <Label htmlFor="picture">Image prompt</Label>
            <Input
              id="picture"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Button
              type="submit"
              className="flex gap-2"
              disabled={loading}
            >
              Generate {loading && <LoadingIcon />}
            </Button>

            <div className="border border-gray-200 w-full square h-[400px] rounded-lg relative">
              {!loading && image && (
                <img
                  className="w-full h-full object-contain"
                  src={image}
                  alt="Generated image"
                ></img>
              )}
              {loading && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center gap-2">
                  {status} <LoadingIcon />
                </div>
              )}
              {loading && <Skeleton className="w-full h-full" />}
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
