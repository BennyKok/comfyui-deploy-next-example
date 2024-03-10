"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { ComfyDeployClient } from 'comfydeploy';


export function useComfyWebSocket({
    getWebsocketUrl, onOutputReceived, workflow_id
}: {
    workflow_id: string;
    getWebsocketUrl: (workflow_id: string) => ReturnType<ComfyDeployClient["getWebsocketUrl"]>;
    onOutputReceived?: (props: {
        outputId: string; imageType: string; data: Blob;
    }) => void;
}) {
    const { data } = useSWR(workflow_id, getWebsocketUrl.bind(null, workflow_id), {
        revalidateOnFocus: false,
    });
    const [ws, setWs] = useState<WebSocket>();
    const [status, setStatus] = useState("not-connected");
    const [remainingQueue, setRemainingQueue] = useState(0);

    const [currentLog, setCurrentLog] = useState<string>();
    const [reconnectCounter, setReconnectCounter] = useState(0);

    const statusRef = useRef(status);
    useEffect(() => {
        if (statusRef.current !== status) {
            // console.log("Status changed:", status);
            statusRef.current = status;
        }
    }, [status]);

    const sendInput = useCallback((inputs: Record<string, string | number>) => {
        if (statusRef.current == "reconnecting" || statusRef.current == "connecting")
            return;

        if (ws?.readyState == ws?.CLOSED) {
            setStatus('reconnecting');
            statusRef.current = 'reconnecting'
            setReconnectCounter(x => x + 1);
            return;
        }

        if (statusRef.current != "ready")
            return;

        ws?.send(JSON.stringify(
            {
                "event": "input",
                "inputs": inputs,
            }
        ));
    }, [ws]);

    const sendImageInput = useCallback((input_id: string, data: ArrayBuffer, imageType: 'image/jpeg' | 'image/png' | 'image/webp') => {
        if (statusRef.current == "reconnecting" || statusRef.current == "connecting")
            return;

        if (ws?.readyState == ws?.CLOSED) {
            setStatus('reconnecting');
            statusRef.current = 'reconnecting'
            setReconnectCounter(x => x + 1);
            return;
        }

        if (statusRef.current != "ready")
            return;

        // Clamp and pad input_id
        let clampedInputId = input_id.substring(0, 24).padEnd(24, ' ');
        // Convert input_id to ASCII encoded Uint8Array
        let encodedInputId = new TextEncoder().encode(clampedInputId);

        // Determine image type code
        let imageTypeCode: number;
        switch (imageType) {
            case 'image/jpeg':
                imageTypeCode = 1;
                break;
            case 'image/png':
                imageTypeCode = 2;
                break;
            case 'image/webp':
                imageTypeCode = 3;
                break;
            default:
                throw new Error('Unsupported image type');
        }

        // Read the Blob data as ArrayBuffer
        const buffer = data;
        // Create a new ArrayBuffer for the message, adding 4 bytes at the start for the event code
        let messageBuffer = new ArrayBuffer(4 + 4 + 24 + buffer.byteLength); // Added 4 bytes for the event code
        let view = new DataView(messageBuffer);
    
        // Set the event code at the start of the message
        view.setUint32(0, 0, true); // true for little-endian, event code is 0
    
        // Set the image type code, now starting at byte 4 due to the event code
        view.setUint32(4, imageTypeCode, true); // Adjusted offset for the event code
    
        // Set the encoded input_id, now starting at byte 8
        new Uint8Array(messageBuffer, 8, 24).set(encodedInputId);
    
        // Copy the image data into the message buffer, starting after the event code, image type code, and input_id
        new Uint8Array(messageBuffer, 8 + 24).set(new Uint8Array(buffer));
    
        // Send the binary message
        ws?.send(messageBuffer);
    }, [ws]);

    const connectWS = useCallback((data: NonNullable<Awaited<ReturnType<typeof getWebsocketUrl>>>) => {
        setStatus("connecting");
        console.log("Connecting");
        statusRef.current = 'connecting'

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
                if (message?.event == "status" && message?.data?.status?.exec_info) {
                    setRemainingQueue(message.data.status.exec_info.queue_remaining);
                }
                if (message?.event) {
                    if (message?.event == "executing" && message?.data?.node == null)
                        setCurrentLog("done");
                    else if (message?.event == "live_status")
                        setCurrentLog(`running - ${message.data?.current_node} ${(message.data.progress * 100).toFixed(2)}%`);
                    else if (message?.event == "elapsed_time")
                        setCurrentLog(`elapsed time: ${Math.ceil(message.data?.elapsed_time * 100) / 100}s`);
                }
                console.log("Received message:", message);
            }
            if (event.data instanceof ArrayBuffer) {
                // console.log("Received binary message:");

                const arrayBuffer = event.data;

                const view = new DataView(arrayBuffer);
                const eventType = view.getUint32(0);
                const buffer = arrayBuffer.slice(4);
                switch (eventType) {
                    case 1:
                        const imageTypeSize = 4;
                        const outputIdSize = 24;

                        // Extract the bytes for the output_id
                        let outputIdBytes = new Uint8Array(buffer, imageTypeSize, outputIdSize);
                        // Convert the bytes to an ASCII string
                        let outputId = new TextDecoder("ascii").decode(outputIdBytes);

                        console.log("Extracted output_id:", outputId);

                        const view2 = new DataView(arrayBuffer);
                        const imageType = view2.getUint32(0);
                        let imageMime;
                        switch (imageType) {
                            case 1:
                            default:
                                imageMime = "image/jpeg";
                                break;
                            case 2:
                                imageMime = "image/png";
                                break;
                            case 3:
                                imageMime = "image/webp";
                        }
                        const blob = new Blob([buffer.slice(4 + outputIdSize)], { type: imageMime });
                        const fileSize = blob.size;
                        console.log(`Received image size: ${(fileSize / 1024).toFixed(2)} KB`);

                        if (onOutputReceived)
                            onOutputReceived({ outputId, imageType: imageMime, data: blob });

                        break;
                    default:
                        throw new Error(`Unknown binary websocket message of type ${eventType}`);
                }
            }
        };
        websocket.onclose = () => setStatus("closed");
        websocket.onerror = () => setStatus("error");

        setWs(websocket);

        return () => {
            websocket.close();
        };
    }, [data]);

    useEffect(() => {
        if (!data) {
            setStatus("not-connected");
            console.log(
                "not-connected"
            );
            
            statusRef.current = 'not-connected'
            return;
        }

        return connectWS(data);
    }, [connectWS, reconnectCounter]);

    return { status, sendInput, connectWS, sendImageInput, currentLog, remainingQueue };
}
