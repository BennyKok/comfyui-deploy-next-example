"use server"

import { ComfyDeployClient } from "@/lib/comfy-deploy"

const client = new ComfyDeployClient({
    apiBase: process.env.COMFY_API_URL,
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

export async function generate_img(input_image: string){
    return await client.run({
        deployment_id: process.env.COMFY_DEPLOYMENT_ID_IMG_2_IMG!,
        inputs: {
            "input_image": input_image
        }
    })
}

export async function checkStatus(run_id: string){
    return await client.getRun(run_id)
}

export async function getUploadUrl(type: string, file_size: number){
    try {
        return await client.getUploadUrl(type, file_size)
    } catch (error) {
        console.log(error)
    }
}