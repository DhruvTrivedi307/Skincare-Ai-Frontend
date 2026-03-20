// // import { GoogleGenAI } from "@google/genai";
// import { NextResponse } from "next/server";

// // const ai = new GoogleGenAI({
// //     apiKey: process.env.GEMINI_API_KEY!,
// // });

// export async function POST(req: Request) {
//     // const body = await req.json();
//     const formData = await req.formData();
//     const image = formData.get("image") as File;

//     if (!image) {
//         return new Response(
//             JSON.stringify({ error: "No image uploaded" }),
//             { status: 400 }
//         );
//     }

//     // const base64Image = body.image.replace(
//     //     /^data:image\/\w+;base64,/,
//     //     ""
//     // );

//     const forwardFormData = new FormData();
//     forwardFormData.append("image", image);

//     const laravelResponse = await fetch(
//         `${process.env.LARAVEL_API_URL}/api/analyze`,
//         {
//             method: "POST",
//             body: forwardFormData,
//         }
//     );

//     if (!laravelResponse.ok) {
//         return NextResponse.json(
//             { error: "Failed to analyze image via Laravel" },
//             { status: 500 }
//         );
//     }

//     const response = await laravelResponse.json();

//     // const response = await ai.models.generateContent({

//     //     model: "gemini-2.5-flash-lite",
//     //     contents: [
//     //         {
//     //             inlineData: {
//     //                 mimeType: "image/jpeg", 
//     //                 data: base64Image,
//     //             },
//     //         },
//     //         {
//     //             text: `
//         //             You are a deterministic AI system for cosmetic skin analysis. 
//         //             This is NOT a medical diagnosis.

//         //             Follow these rules STRICTLY:

//         //             GLOBAL RULES:
//         //             - Use consistent, objective visual reasoning only.
//         //             - Do NOT guess or hallucinate conditions.
//         //             - Ignore lighting artifacts, shadows, compression noise, reflections, or camera blur unless clearly a skin condition.
//         //             - Be conservative — if uncertain, choose a healthier outcome.
//         //             - Never return emotional, descriptive, or advisory text.
//         //             - Return STRICT JSON only. No markdown, no code blocks.

//         //             REGION ANALYSIS:
//         //             Analyze ONLY the following regions:
//         //             ${body.regions.join(", ")}

//         //             For EACH region:

//         //             1. Identify visible skin issues.
//         //             - Never return an empty array.
//         //             - Never return a Good or Healthy results in every regions simultaneously. Always return at least one issue per regions.

//         //             2. Confidence must be an INTEGER between 0-100.
//         //             - Use HIGH confidence (≥70) only when the condition is visually clear.
//         //             - If unsure, lower the confidence.

//         //             3. Determine RESULT using this scale:
//         //             0-40  → Good  
//         //             41-60 → Average  
//         //             61-100 → Poor  

//         //             4. Determine SKIN_RATING using this scale:
//         //             0-40  → Poor  
//         //             41-60 → Medium  
//         //             61-100 → Healthy  

//         //             5. Do NOT return:
//         //             - coordinates
//         //             - landmarks
//         //             - explanations
//         //             - recommendations

//         //             OUTPUT REQUIREMENTS:
//         //             - Output MUST be valid JSON.
//         //             - Do NOT wrap JSON in markdown.
//         //             - Do NOT include comments.
//         //             - Do NOT change key names.
//         //             - Return ONE object per region.

//         //             STRICT JSON FORMAT:

//         //             {
//         //                 "forehead":{
//         //                     "issue":["string"], (Capitalized)
//         //                     "confidence":0,
//         //                     "rating":0,
//         //                     "skin_rating":"Healthy | Medium | Poor",
//         //                     "result":"Good | Average | Poor"
//         //                 },
//         //                 "left_cheek":{
//         //                     "issue":["string"],
//         //                     "confidence":0,
//         //                     "rating":0,
//         //                     "skin_rating":"Healthy | Medium | Poor",
//         //                     "result":"Good | Average | Poor"
//         //                 },
//         //                 "right_cheek":{
//         //                     "issue":["string"],
//         //                     "confidence":0,
//         //                     "rating":0,
//         //                     "skin_rating":"Healthy | Medium | Poor",
//         //                     "result":"Good | Average | Poor"
//         //                 },
//         //                 "nose":{
//         //                     "issue":["string"],
//         //                     "confidence":0,
//         //                     "rating":0,
//         //                     "skin_rating":"Healthy | Medium | Poor",
//         //                     "result":"Good | Average | Poor"
//         //                 },
//         //                 "chin":{
//         //                     "issue":["string"],
//         //                     "confidence":0,
//         //                     "rating":0,
//         //                     "skin_rating":"Healthy | Medium | Poor",
//         //                     "result":"Good | Average | Poor"
//         //                 },
//         //                 "left_eye_bottom":{
//         //                     "issue":["string"],
//         //                     "confidence":0,
//         //                     "rating":0,
//         //                     "skin_rating":"Healthy | Medium | Poor",
//         //                     "result":"Good | Average | Poor"
//         //                 },
//         //                 "right_eye_bottom":{
//         //                     "issue":["string"],
//         //                     "confidence":0,
//         //                     "rating":0,
//         //                     "skin_rating":"Healthy | Medium | Poor",
//         //                     "result":"Good | Average | Poor"
//         //                 }
//         //             }
//         //             `,
//         //     },
//         // ],
//     // });

//     const result = (response.text ?? "")
//         .replace(/```json/g, "")
//         .replace(/```/g, "")
//         .trim();


//     // return NextResponse.json({
//     //     result: JSON.parse(result),
//     // });

//     return NextResponse.json(result);

// }