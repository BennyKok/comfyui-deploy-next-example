https://github.com/BennyKok/comfyui-deploy-next-example/assets/18395202/6e7e013c-21aa-432d-af77-07f729912f0f

![Discord Banner 4](https://discordapp.com/api/guilds/7hn3vN8p/widget.png?style=banner4)

### Intro

This project is designed to demonstrate the integration and utilization of the ComfyDeploy SDK within a Next.js application.
The primary focus is to showcase how developers can get started creating applications running ComfyUI workflows using Comfy Deploy.
Create an account on [ComfyDeply](https://comfydeploy.com/) setup your workflow and machine ([view here](https://twitter.com/BennyKokMusic/status/1746578134311243830)) and environemnt key

### Connecting with ComfyDeploy

To use this project with ComfyDeploy, you need to:

1. Create an account on [ComfyDeploy](https://comfydeploy.com/) and set up your deployment environments.
2. Obtain the necessary API tokens and deployment IDs from your ComfyDeploy dashboard.
3. Configure the `.env.local` file with your ComfyDeploy settings.

### Environment Variables

To connect with ComfyDeploy's services, the project uses several environment variables defined in the `.env.local` file. These include:

- `COMFY_API_TOKEN`: A token for authenticating API requests [ComfyDeploy API](https://www.comfydeploy.com/api-keys).
- `COMFY_API_URL`: Comfy Deploys base URL, this is optional and if you want to use https://www.comfydeploy.com you can leave this blank.

These are the `deployment ids` for your workflows. read more here [Workflow docs](https://www.comfydeploy.com/docs/workflows#deployments-and-apis)

- `COMFY_DEPLOYMENT_ID`: The deployment ID for a text-to-image service. [Example workflow](https://www.comfydeploy.com/docs/workflows#deployments-and-apis) you can clone.
- `COMFY_DEPLOYMENT_ID_CONTROLNET`: The deployment ID for a controlnet workflow. [Example workflow](https://www.comfydeploy.com/share/333f0b66-b312-41f7-ba26-187dde7a1af0) you can clone.

There are other examples for deployment ids, for different types of workflows, if you're interested in learning more or getting an example join our [discord](https://discord.gg/7hn3vN8p)

### Comfy Deploy SDK

[npm sdk](https://www.npmjs.com/package/comfydeploy)

Workflow Demo

1. Text 2 Image -> https://www.comfydeploy.com/share/fb58d1cd-8a45-4893-9ab4-ea88d713c9b7
2. Control Net Image 2 Image -> https://www.comfydeploy.com/share/333f0b66-b312-41f7-ba26-187dde7a1af0

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
