"use client"

import { getWebsocketUrl } from '@/server/generate'
import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useDebounce } from "use-debounce";
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

export function WebsocketDemo() {
    const { data } = useSWR("ws", getWebsocketUrl, {
        revalidateOnFocus: false,
    })
    const [ws, setWs] = useState<WebSocket>()

    const [status, setStatus] = useState("not-connected")
    const [prompt, setPrompt] = useState('A anime cat');
    const [debouncedPrompt] = useDebounce(prompt, 200);

    const [currentLog, setCurrentLog] = useState<string>();

    const [reconnectCounter, setReconnectCounter] = useState(0)

    const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to the canvas element

    const sendInput = useCallback(() => {
        if (status == "reconnecting" || status == "connecting")
            return

        if (ws?.readyState == ws?.CLOSED) {
            setStatus('reconnecting')
            setReconnectCounter(x => x + 1)
            return
        }

        if (status != "ready")
            return

        ws?.send(JSON.stringify(
            {
                "event": "input",
                "inputs": {
                    "input_text": debouncedPrompt
                }
            }
        ))
    }, [ws, debouncedPrompt, status])

    const preStatus = useRef(status)

    useEffect(() => {
        if (preStatus.current != status && status == "ready")
            sendInput();
        preStatus.current = status
    }, [status, sendInput])

    useEffect(() => {
        sendInput();
    }, [debouncedPrompt])

    const connectWS = useCallback((data: NonNullable<Awaited<ReturnType<typeof getWebsocketUrl>>>) => {
        setStatus("connecting");
        const websocket = new WebSocket(data.ws_connection_url);
        websocket.binaryType = "arraybuffer";
        websocket.onopen = () => {
            setStatus("connected");
        };
        websocket.onmessage = (event) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                if (message?.event == "status" && message?.data?.sid) {
                    setStatus("ready");
                }
                if (message?.event) {
                    if (message?.event == "executing" && message?.data?.node == null)
                        setCurrentLog("done")
                    else if (message?.event == "live_status")
                        setCurrentLog(`running - ${message.data?.current_node} ${(message.data.progress * 100).toFixed(2)}%`)
                    else if (message?.event == "elapsed_time")
                        setCurrentLog(`elapsed time: ${Math.ceil(message.data?.elapsed_time * 100) / 100}s`)
                }
                console.log("Received message:", message);
            }
            if (event.data instanceof ArrayBuffer) {
                console.log("Received binary message:");
                drawImage(event.data);
            }
        };
        websocket.onclose = () => setStatus("closed");
        websocket.onerror = () => setStatus("error");

        setWs(websocket);

        return () => {
            websocket.close();
        };
    }, [data])

    const drawImage = useCallback((arrayBuffer: ArrayBuffer) => {
        const view = new DataView(arrayBuffer);
        const eventType = view.getUint32(0);
        const buffer = arrayBuffer.slice(4);
        switch (eventType) {
            case 1:
                const view2 = new DataView(arrayBuffer);
                const imageType = view2.getUint32(0)
                let imageMime
                switch (imageType) {
                    case 1:
                    default:
                        imageMime = "image/jpeg";
                        break;
                    case 2:
                        imageMime = "image/png"
                        break;
                    case 3:
                        imageMime = "image/webp"
                }
                const blob = new Blob([buffer.slice(4)], { type: imageMime });
                const fileSize = blob.size;
                console.log(`Received image size: ${(fileSize / 1024).toFixed(2)} KB`);

                // const blob = new Blob([arrayBuffer], { type: 'image/png' }); // Assuming the image is a JPEG
                const url = URL.createObjectURL(blob);

                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');

                if (ctx) {
                    console.log("drawing");

                    const img = new Image();
                    img.onload = () => {
                        if (canvas) {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        }
                        URL.revokeObjectURL(url); // Clean up
                    };
                    img.src = url;
                }
                // this.dispatchEvent(new CustomEvent("b_preview", { detail: imageBlob }));
                break;
            default:
                throw new Error(`Unknown binary websocket message of type ${eventType}`);
        }
    }, []);

    useEffect(() => {
        if (!data) {
            setStatus("not-connected");
            return;
        }

        return connectWS(data)
    }, [connectWS, reconnectCounter])

    const pending = (status == "not-connected" || status == "connecting" || status == "reconnecting" || currentLog?.startsWith("running") || (!currentLog && status == "connected"))

    return (
        <div className='flex md:flex-col gap-2 px-2 flex-col-reverse'>
            <div className='flex gap-2'>
                <Badge variant={'outline'} className='w-fit'>Status: {status}</Badge>
                {(currentLog || status == "connected" || status == "ready") && <Badge variant={'outline'} className='w-fit'>
                    {currentLog}
                    {status == "connected" && !currentLog && "stating comfy ui"}
                    {status == "ready" && !currentLog && " running"}
                </Badge>}
            </div>

            <div className='relative w-full'>
                <canvas ref={canvasRef} className='rounded-lg ring-1 ring-black/10 w-full aspect-square' width={1024} height={1024}></canvas>
                {
                    <><Skeleton className={
                        cn("absolute top-0 left-0 w-full h-full aspect-square opacity-20 transition-opacity", pending ? "visible" : "invisible opacity-0")
                    } /></>
                }
            </div>


            <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
        </div>
    )
}