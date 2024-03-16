"use client"

import { getWebsocketUrl2, getWebsocketUrl3, getWebsocketUrlAny } from '@/server/generate'
import { RefObject, useEffect, useRef, useState } from 'react'
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
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Coordinates } from '@dnd-kit/core/dist/types';
import {
    createSnapModifier,
    restrictToHorizontalAxis,
    restrictToVerticalAxis,
    restrictToWindowEdges,
    snapCenterToCursor,
} from '@dnd-kit/modifiers';
import { Camera, Cog, Equal, Pause, Play, ScreenShare, Settings } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { DemoClosedNotice } from '@/components/DemoClosedNotice';

const jugg = {
    input_checkpoint: "juggernautXL_v9Rdphoto2Lightning.safetensors",
    deployment_id: "701495af-361b-4962-8471-ea0df08ad130",
}
const disney = {
    input_checkpoint: "modernDisneyXL_v3.safetensors",
    deployment_id: "886a9b15-3585-4491-9226-04d0e7d41aff",
}

export function WebsocketDemo3() {
    const [prompt, setPrompt] = useState('A cyberpunk game, unreal engine, inside a room, industrial');
    const [debouncedPrompt] = useDebounce(prompt, 200);

    const [denoise, setDenoise] = useState(0.72);
    const [debouncedDenoise] = useDebounce(denoise, 200);

    const [checkpoint, setCheckpoint] = useDebounce("juggernautXL_v9Rdphoto2Lightning.safetensors", 200);

    const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to the canvas element
    const canvasRefIn = useRef<HTMLCanvasElement>(null); // Reference to the canvas element

    const sendReceiveRef = useRef({
        sent: 0,
        receive: 0
    })

    const [pause, setPause] = useState(false)

    const [seed, setSeed] = useState(1112148005096468)
    const [debouncedSeed] = useDebounce(seed, 200);

    const [selectedWorkflow, setSelectedWorkflow] = useState(jugg);

    useEffect(() => {
        sendReceiveRef.current = {
            sent: 0,
            receive: 0
        }
        console.log(sendReceiveRef.current);
    }, [pause])

    const { status, sendInput, currentLog, sendImageInput, remainingQueue } = useComfyWebSocket({
        workflow_id: selectedWorkflow.deployment_id,
        enabled: false,
        getWebsocketUrl: getWebsocketUrlAny, onOutputReceived: ({
            data,
            outputId
        }) => {
            sendReceiveRef.current.receive += 1;
            // console.log(data, outputId);

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
            // "input_checkpoint": checkpoint,
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

    const { startScreenCapture, stopScreenCapture, isStarted } = useEditorEvent(
        {
            status: status,
            timeout: 200,
            pause: pause,
            canvasDiv: canvasRefIn,
            sendReceiveRef: sendReceiveRef,
            onChange: async (blob) => {
                console.log('changed');
                sendImageInput("input_id", await blob.arrayBuffer(), 'image/webp');
            }
        }
    )

    const [{ x, y }, setCoordinates] = useState<Coordinates>({
        x: 20, y: 200
    });

    return (
        <DndContext
            modifiers={[restrictToWindowEdges]}
            onDragEnd={({ delta }) => {
                setCoordinates(({ x, y }) => {
                    return {
                        x: x + delta.x,
                        y: y + delta.y,
                    };
                });
            }}>
            <div className='flex flex-col gap-2'>
                <DemoClosedNotice />
                {/* <div className='p-2 bg-gray-50 rounded-md'>The server queue remaining {remainingQueue}, the websocket will auto disconnect on 2 seconds non-interative, draw or type to trigger it.</div> */}
                <div className='flex md:flex-row gap-2 px-2 flex-col-reverse'>
                    <canvas className='w-1/2 aspect-square bg-primary-foreground' ref={canvasRefIn}></canvas>
                    {/* <div className=''> */}
                    <canvas ref={canvasRef} className='rounded-lg ring-1 ring-black/10 w-1/2 aspect-square' width={1024} height={1024}></canvas>
                    {/* </div> */}
                </div>

                {/* <div className='absolute left-1 flex flex-col h-full justify-center mt-[-200px]'> */}
                <DragWrapper x={x} y={y}>
                    <div className='flex gap-2'>
                        <Badge variant={'outline'} className='w-fit truncate'>Status: {status}</Badge>
                        {(currentLog || status == "connected" || status == "ready") && <Badge variant={'outline'} className='w-fit truncate'>
                            {currentLog}
                            {status == "connected" && !currentLog && "strating comfy ui"}
                            {status == "ready" && !currentLog && " running"}
                        </Badge>}
                    </div>
                    <Select
                        defaultValue='wf1'
                        onValueChange={(e) => {
                            // setCheckpoint(e);
                            if (e == "wf1") {
                                setSelectedWorkflow(jugg)
                            }
                            if (e == "wf2") {
                                setSelectedWorkflow(disney)
                            }
                        }}>
                        <SelectTrigger className="w-[180px]" >
                            <SelectValue placeholder="Select a fruit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="wf1">Workflow 1</SelectItem>
                                <SelectItem value="wf2">Workflow 2</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <div className='flex flex-row gap-2'>
                        {
                            isStarted && <Button onClick={stopScreenCapture} className="py-2 px-4 bg-red-500 text-white rounded hover:bg-red-700">
                                Stop Capture
                            </Button>
                        }
                        {
                            !isStarted && <Button onClick={() => {
                                startScreenCapture()
                            }} className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-700">
                                <ScreenShare size={20} />
                            </Button>
                        }
                        {
                            !isStarted && <Button onClick={() => {
                                startScreenCapture({
                                    video: {
                                        facingMode: "user",
                                        // width: { exact: 1024 }, height: { exact: 1024 }
                                    }
                                }, false)
                            }} className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-700">
                                <Camera size={20} />
                            </Button>
                        }
                        <Button onClick={() => setPause(!pause)} className="py-2 px-4 bg-yellow-500 text-white rounded hover:bg-yellow-700">
                            {pause ? <Play size={20}></Play> : <Pause size={20}></Pause>}
                        </Button>
                    </div>
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <Input
                        className='text-sm'
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(parseInt(e.target.value))}
                    />
                    <div className='flex text-sm'>
                        <Slider value={[denoise]} max={1} min={0} step={0.01} onValueChange={(e) => {
                            setDenoise(e[0])
                        }}> </Slider>{debouncedDenoise}
                    </div>
                </DragWrapper>
            </div>
            {/* </div> */}
        </DndContext>
    )
}


function DragWrapper(props: {
    children: React.ReactNode
    x: number, y: number
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'unique-id',
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return <Card className=' p-2 rounded-sm space-y-2 w-96 absolute' ref={setNodeRef} style={{ ...style, top: props.y, left: props.x }} >
        <div className='flex justify-between text-sm items-center  bg-primary-foreground py-2 px-3 rounded-sm'>
            <span className='flex items-center gap-2'> <Settings size={16} /> Settings</span>
            <button {...listeners} {...attributes} ><Equal size={16} /></button>
        </div>
        {/* <div className='h-[1px]'></div> */}
        {props.children}
    </Card>
}

function useEditorEvent(props: {
    status: string,
    onChange: (e: Blob) => void,
    timeout: number,
    canvasDiv: RefObject<HTMLCanvasElement>
    pause: boolean
    sendReceiveRef: RefObject<{
        sent: number,
        receive: number
    }>
}) {
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameIdRef = useRef<number | null>(null); // Store the requestAnimationFrame ID
    const [isStarted, setStarted] = useState(false);

    const pauseRef = useRef(props.pause)
    useEffect(() => {
        pauseRef.current = props.pause
    }, [props.pause])

    const statusRef = useRef(props.status)

    useEffect(() => {
        statusRef.current = props.status;
    }, [props.status])

    const onChangeRef = useRef(props.onChange)

    useEffect(() => {
        onChangeRef.current = props.onChange
    }, [props.onChange])

    const startScreenCapture = async (captureConstraints: MediaStreamConstraints = { video: true }, display: boolean = true) => {
        if (!props.canvasDiv.current) return;
        try {
            console.log(captureConstraints);
            const stream = display ? await navigator.mediaDevices.getDisplayMedia(captureConstraints) : await navigator.mediaDevices.getUserMedia(captureConstraints);

            setMediaStream(stream);
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            const renderVideoToCanvas = () => {
                const ctx = props.canvasDiv.current?.getContext('2d');
                if (ctx) {
                    const size = Math.min(video.videoWidth, video.videoHeight);
                    const startX = (video.videoWidth - size) / 2;
                    const startY = (video.videoHeight - size) / 2;
                    const outputSize = Math.min(size, 1024);
                    props.canvasDiv.current!.width = outputSize;
                    props.canvasDiv.current!.height = outputSize;
                    ctx.drawImage(video, startX, startY, size, size, 0, 0, props.canvasDiv.current!.width, props.canvasDiv.current!.height);

                    animationFrameIdRef.current = requestAnimationFrame(renderVideoToCanvas);
                }
            };

            renderVideoToCanvas();

            intervalIdRef.current = setInterval(() => {
                // if (statusRef.current != "ready")
                //     return;
                if (pauseRef.current) return

                console.log(props.sendReceiveRef.current);
                if (props.sendReceiveRef.current!.sent > props.sendReceiveRef.current!.receive) return;

                props.canvasDiv.current!.toBlob(blob => {
                    if (blob) {
                        console.log("got image");
                        console.log(`Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
                        onChangeRef.current(new Blob([blob], { type: 'image/webp' }));
                        props.sendReceiveRef.current!.sent += 1;
                    }
                }, 'image/webp', 0.6);
            }, 2000);
            setStarted(true);
        } catch (error) {
            console.error('Error capturing screen:', error);
        }
    };

    const stopScreenCapture = () => {
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current); // Stop the rendering loop
            animationFrameIdRef.current = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }

        // if (props.canvasDiv.current) {
        //     const ctx = props.canvasDiv.current.getContext('2d');
        //     if (ctx) {
        //         ctx.clearRect(0, 0, props.canvasDiv.current.width, props.canvasDiv.current.height); // Clear the canvas
        //     }
        // }

        setStarted(false);
    };

    return ({
        startScreenCapture, stopScreenCapture, isStarted
    })
}