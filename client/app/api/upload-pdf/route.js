import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || (file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf"))) {
      return NextResponse.json({ error: "File must be PDF type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();

    const cleaned = (textResult?.text || "").replace(/\n\s*\n/g, "\n").trim();

    return NextResponse.json({
      success: true,
      text: cleaned,
    });
  } catch (error) {
    console.error("PDF Parse Error:", error); //remove later
    return NextResponse.json({ error: "Internal server error" }, { staus: 500 });
  }
}