"use client"

import { getWebsocketUrl } from '@/server/generate'
import { useEffect, useRef, useState } from 'react'
import { useDebounce } from "use-debounce";
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useComfyWebSocket } from './useComfyWebSocket';

export function WebsocketDemo() {
    const [prompt, setPrompt] = useState('A anime cat');
    const [debouncedPrompt] = useDebounce(prompt, 200);
    const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to the canvas element

    const { status, sendInput, currentLog } = useComfyWebSocket({
        getWebsocketUrl: getWebsocketUrl, onOutputReceived: ({
            data
        }) => {
            const url = URL.createObjectURL(data);

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');

            if (ctx) {
                const img = new Image();
                img.onload = () => {
                    if (canvas) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    }
                    URL.revokeObjectURL(url); // Clean up
                };
                img.src = url;
            }
        }
    })

    const preStatus = useRef(status)

    useEffect(() => {
        if (preStatus.current != status && status == "ready")
            sendInput({
                "input_text": debouncedPrompt,
            });
        preStatus.current = status
    }, [status, sendInput])

    useEffect(() => {
        sendInput({
            "input_text": debouncedPrompt,
        });
    }, [debouncedPrompt])

    const pending = (status == "not-connected" || status == "connecting" || status == "reconnecting" || currentLog?.startsWith("running") || (!currentLog && status == "connected"))

    return (
        <div className='flex md:flex-col gap-2 px-2 flex-col-reverse'>
            <div className='flex gap-2'>
                <Badge variant={'outline'} className='w-fit'>Status: {status}</Badge>
                {(currentLog || status == "connected" || status == "ready") && <Badge variant={'outline'} className='w-fit'>
                    {currentLog}
                    {status == "connected" && !currentLog && "starting comfy ui"}
                    {status == "ready" && !currentLog && " running"}
                </Badge>}
            </div>

            <div className='relative w-full'>
                <canvas ref={canvasRef} className='rounded-lg ring-1 ring-black/10 w-full aspect-square' width={1024} height={1024}></canvas>
                {/* {
                    <><Skeleton className={
                        cn("absolute top-0 left-0 w-full h-full aspect-square opacity-20 transition-opacity", pending ? "visible" : "invisible opacity-0")
                    } /></>
                } */}
            </div>


            <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
        </div>
    )
}