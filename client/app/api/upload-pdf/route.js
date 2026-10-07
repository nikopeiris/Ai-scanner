import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (file?.type != "application/pdf") {
      return NextResponse.json({ error: "File must be Pdf type" }, { staus: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const text = await pdfParse(buffer);
    const cleaned = text.text.repalce(/\n\s*\n/g, "\n").trim();

    return NextResponse.json({
      success: true,
      text: cleaned,
    });
  } catch (error) {
    console.error("PDF Parse Error:", error); //remove later
    return NextResponse.json({ error: "Internal server error" }, { staus: 500 });
  }
}