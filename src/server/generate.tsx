"use server"

import { ComfyDeployClient } from "@/lib/comfy-deploy"

const client = new ComfyDeployClient({
    apiToken: process.env.COMFY_API_TOKEN!,
})

export async function generate(prompt: string){
    return await client.run({
        deployment_id: process.env.COMFY_DEPLOYMENT_ID!,
        inputs: {
            "input_text": prompt
        }
    })
}

export async function checkStatus(run_id: string){
    return await client.getRun(run_id)
}