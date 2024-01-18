import { z } from "zod";

const runTypes = z.object({
  run_id: z.string(),
});

const runOutputTypes = z.object({
  id: z.string(),
  status: z.enum(["success", "failed", "running", "uploading", "not-started"]),
  outputs: z.array(
    z.object({
      data: z.any(),
    }),
  ),
});

const uploadFileTypes = z.object({
  upload_url: z.string(),
  file_id: z.string(),
  download_url: z.string(),
});

export class ComfyDeployClient {
  apiBase: string = "https://www.comfydeploy.com/api";
  apiToken: string;

  constructor({ apiBase, apiToken }: { apiBase?: string; apiToken: string }) {
    if (apiBase) {
      this.apiBase = `${apiBase}/api`;
    }
    this.apiToken = apiToken;
  }

  async run({
    deployment_id,
    inputs,
  }: {
    deployment_id: string;
    inputs?: Record<string, string>;
  }) {
    return fetch(`${this.apiBase}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        deployment_id: deployment_id,
        inputs: inputs,
      }),
      cache: "no-store",
    })
      .then((response) => {
        console.log('response', response)
        return response.json()})
      .then((json) => {
        console.log('json', json)
        return runTypes.parse(json)})
      .catch((err) => {
        console.error('err', err);
        return null;
      });
  }

  async getRun(run_id: string) {
    return await fetch(`${this.apiBase}/run?run_id=${run_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${this.apiToken}`,
      },
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((json) => runOutputTypes.parse(json))
      .catch((err) => {
        console.error(err);
        return null;
      });
  }

  async runSync(props: {
    deployment_id: string;
    inputs?: Record<string, string>;
  }) {
    const runResult = await this.run(props);
    if (!runResult) return null;

    // 5 minutes
    const timeout = 60 * 5;
    const interval = 1000;

    let run: Awaited<ReturnType<typeof this.getRun>> = null;
    for (let i = 0; i < timeout; i++) {
      run = await this.getRun(runResult.run_id);
      if (run && run.status == "success") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    if (!run) {
      return {
        id: runResult.run_id,
      };
    }

    return run;
  }

  async getUploadUrl(type: string, file_size: number) {
    const obj = {
      type: type,
      file_size: file_size.toString(),
    };
    const url = new URL(`${this.apiBase}/upload-url`);
    url.search = new URLSearchParams(obj).toString();

    return await fetch(url.href, {
      method: "GET",
      headers: {
        authorization: `Bearer ${this.apiToken}`,
      },
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((json) => uploadFileTypes.parse(json))
      .catch((err) => {
        console.error(err);
        return null;
      });
  }
}
