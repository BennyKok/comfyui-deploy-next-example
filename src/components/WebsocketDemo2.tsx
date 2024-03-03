"use client"

import { getWebsocketUrl2 } from '@/server/generate'
import { useEffect, useRef, useState } from 'react'
import { useDebounce } from "use-debounce";
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useComfyWebSocket } from './useComfyWebSocket';
import useSWR from 'swr';
import { Tldraw, exportAs, exportToBlob, useEditor } from "tldraw";
import { useThrottledCallback } from 'use-debounce';
import html2canvas from 'html2canvas';
import { toBlob } from 'html-to-image';
import { Slider } from './ui/slider';

export function WebsocketDemo2() {
    const [prompt, setPrompt] = useState('A boat');
    const [denoise, setDenoise] = useState(0.6);
    const [debouncedPrompt] = useDebounce(prompt, 200);
    const [debouncedDenoise] = useDebounce(denoise, 200);
    const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to the canvas element

    const [seed, setSeed] = useState(1112148005096468)
    const [debouncedSeed] = useDebounce(seed, 200);

    const { data } = useSWR("image", async () => {
        return fetch("https://media.discordapp.net/attachments/1196602911266971648/1213267514998657084/svqenSwnT2yZQCBpdBsBcQ.png?ex=65f4da6c&is=65e2656c&hm=cec56afa76a0c04c956ee9161f5d7fd7b342226347474474362d349783588578&=&format=webp&quality=lossless&width=700&height=700").then(res => res.arrayBuffer())
    })

    const [canvasDiv, setCanvasDiv] = useState<HTMLDivElement>()

    const { status, sendInput, currentLog, sendImageInput } = useComfyWebSocket({
        getWebsocketUrl: getWebsocketUrl2, onOutputReceived: ({
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

    useEffect(() => {
        sendInput({
            "input_text": debouncedPrompt,
            "input_number": debouncedDenoise,
            "seed": debouncedSeed,
        });
    }, [debouncedPrompt, debouncedDenoise, debouncedSeed])

    const preStatus = useRef(status)

    useEffect(() => {
        if (preStatus.current != status && status == "ready") {
            sendInput({
                "input_text": debouncedPrompt,
                "input_number": debouncedDenoise,
                "seed": debouncedSeed,
            });
        }

        preStatus.current = status
    }, [status])

    // const pending = (status == "not-connected" || status == "connecting" || status == "reconnecting" || currentLog?.startsWith("running") || (!currentLog && status == "connected"))

    return (
        <div>
            <div className='flex md:flex-row gap-2 px-2 flex-col-reverse'>
                <div className='w-1/2 aspect-square'>
                    <Tldraw
                        onMount={() => {
                            setCanvasDiv(
                                document.querySelector('.tl-canvas') as HTMLDivElement
                            )
                        }} >
                        <EditorEvent
                            status={status}
                            timeout={200}
                            canvasDiv={canvasDiv}
                            onChange={async (blob) => {
                                console.log('changed');
                                if (!canvasDiv) return;
                                sendImageInput("input_id", await blob.arrayBuffer(), 'image/webp');
                            }} />
                    </Tldraw>
                </div>

                <div className='w-1/2'>
                    <div className='flex gap-2'>
                        <Badge variant={'outline'} className='w-fit'>Status: {status}</Badge>
                        {(currentLog || status == "connected" || status == "ready") && <Badge variant={'outline'} className='w-fit'>
                            {currentLog}
                            {status == "connected" && !currentLog && "strating comfy ui"}
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
                </div>

            </div>
            <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
            <Input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value))}
            />
            <Slider value={[denoise]} max={1} min={0} step={0.01} onValueChange={(e) => {
                setDenoise(e[0])
            }}> </Slider>{debouncedDenoise}
            {/* <Sli */}
        </div>
    )
}

function EditorEvent(props: {
    status: string,
    onChange: (e: Blob) => void,
    timeout: number // Adding timeout to props
    canvasDiv?: HTMLDivElement
}) {

    const size = 512
    const editor = useEditor();

    const preStatus = useRef(props.status)

    useEffect(() => {
        if (preStatus.current != props.status && props.status == "ready") {
            toBlob(props.canvasDiv as HTMLDivElement, { canvasWidth: size, canvasHeight: size }).then((a) => {
                if (a)
                    props.onChange(a);
            })
        }

        preStatus.current = props.status
    }, [props.status])

    const throttledOnChange = useThrottledCallback(async (e: any) => {
        const a = await toBlob(props.canvasDiv as HTMLDivElement, { canvasWidth: size, canvasHeight: size })
        if (a)
            await props.onChange(a);

        // exportToBlob({
        //     format: 'png',
        //     editor: editor,
        //     ids: Array.from(editor.getPageShapeIds(editor.getCurrentPage())),
        // }).then(async (blob) => {
        //     console.log(blob);
        //     await props.onChange(blob);
        // })
    }, props.timeout);

    useEffect(() => {
        editor.on('change-history', throttledOnChange);
        return () => {
            editor.off('change-history', throttledOnChange);
        };
    }, [editor]); // Include props.timeout in the dependency array

    return <></>;
}