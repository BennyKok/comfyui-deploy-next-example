import { parseWebhookDataSafe } from "comfydeploy";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const [_data, error] = await parseWebhookDataSafe(request);
    if (!_data || error) return error;

    const { status, run_id, outputs } = _data;

    // Do your things
    console.log(status, run_id, outputs);

    return NextResponse.json({ message: "success" }, { status: 200 });
}