"use client";

import { useEffect, useRef, useState } from "react";
import {
    FaceLandmarker,
    FilesetResolver,
    DrawingUtils
} from "@mediapipe/tasks-vision";
import { Camera, RotateCcw } from 'lucide-react';
import { Accordion, AccordionDetails, AccordionSummary, Button, Card, CardActions, CardContent, CardMedia, CircularProgress, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box } from "@mui/material";
import PillNav from "@/components/PillNav";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Loader, Placeholder } from 'rsuite';
import '../loader.css';
import Lottie from "lottie-react";
import loaderAnimation from "@/components/AI-Skin-Analysis.json";
import { red, yellow, green } from '@mui/material/colors'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export const FACE_REGIONS = {
    forehead: [103, 67, 109, 10, 338, 297, 332, 284, 298, 293, 334, 296, 336, 9, 107, 66, 105, 63, 68, 54],
    left_cheek: [137, 116, 117, 118, 101, 36, 206, 186, 212, 214, 138, 215, 177],
    right_cheek: [345, 366, 401, 435, 367, 434, 432, 410, 426, 266, 330, 347, 346],
    nose: [168, 351, 437, 429, 279, 278, 294, 327, 328, 462, 370, 94, 141, 242, 99, 98, 64, 129, 49, 209, 217, 122],
    chin: [18, 313, 406, 424, 431, 395, 378, 400, 377, 152, 148, 176, 149, 170, 211, 204, 182],
    left_eye_bottom: [130, 25, 110, 24, 23, 22, 26, 112, 243, 244, 245, 128, 121, 120, 119, 118, 117, 111, 35, 226],
    right_eye_bottom: [359, 446, 265, 340, 346, 347, 348, 349, 350, 357, 465, 464, 463, 341, 256, 252, 253, 254, 339, 255]
};

export const REGION_COLORS: Record<string, string> = {
    left_cheek: "rgba(255, 255, 255, 0)",
    right_cheek: "rgba(255, 255, 255, 0)",
    forehead: "rgba(255, 255, 255, 0)",
    nose: "rgba(255, 255, 255, 0)",
    chin: "rgba(255, 255, 255, 0)",
    left_eye_bottom: "rgba(255, 255, 255, 0)",
    right_eye_bottom: "rgba(255, 255, 255, 0)"
    // left_cheek: "rgba(255, 0, 0, 0.6)",
    // right_cheek: "rgba(255, 0, 0, 0.6)",
    // forehead: "rgba(0, 255, 0, 0.6)",
    // nose: "rgba(0, 0, 255, 0.6)",
    // chin: "rgba(255, 255, 0, 0.6)",
    // left_eye_bottom: "rgba(0, 255, 255, 0.6)",
    // right_eye_bottom: "rgba(0, 255, 255, 0.6)"
};

export default function Page() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) {
            console.error("No file dropped");
            return;
        }

        if (!file.type.startsWith("image/")) {
            setOpen(true);
            setErrorTitle("Invalid File");
            setErrorMessage("Please upload an image file.");
            return;
        }

        setUploadedFile(file);
        setCapturedImage(URL.createObjectURL(file));
    }
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [activeRegions, setActiveRegions] = useState<string[]>([
        "left_cheek",
        "right_cheek",
        "chin",
        "forehead",
        "nose",
        "left_eye_bottom",
        "right_eye_bottom"
    ]);

    const [isFaceInside, setIsFaceInside] = useState(false);

    useEffect(() => {
        let faceLandmarker: FaceLandmarker | null = null;
        let running = true;

        async function init() {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numFaces: 1
            });

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            const video = videoRef.current!;
            video.srcObject = stream;

            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });

            const canvas = canvasRef.current!;
            const ctx = canvas.getContext("2d")!;
            const drawingUtils = new DrawingUtils(ctx);

            function detect() {
                if (!running || !faceLandmarker) return;

                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    requestAnimationFrame(detect);
                    return;
                }

                video.width = video.videoWidth;
                video.height = video.videoHeight;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const results = faceLandmarker.detectForVideo(
                    video,
                    performance.now()
                );

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (results.faceLandmarks) {
                    for (const landmarks of results.faceLandmarks) {

                        let minX = Infinity, maxX = -Infinity;
                        let minY = Infinity, maxY = -Infinity;

                        landmarks.forEach((p) => {
                            const x = p.x * canvas.width;
                            const y = p.y * canvas.height;

                            minX = Math.min(minX, x);
                            maxX = Math.max(maxX, x);
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                        });

                        const faceCenterX = (minX + maxX) / 2;
                        const faceCenterY = (minY + maxY) / 2;

                        const ovalWidth = canvas.width * 0.5;
                        const ovalHeight = canvas.height * 0.9;

                        const ovalCenterX = canvas.width / 2;
                        const ovalCenterY = canvas.height / 2;

                        const dx = (faceCenterX - ovalCenterX) / (ovalWidth / 2);
                        const dy = (faceCenterY - ovalCenterY) / (ovalHeight / 2);

                        const inside = dx * dx + dy * dy <= 1;

                        setIsFaceInside(inside);

                        function drawRegion(indices: number[], color: string) {
                            ctx.beginPath();
                            indices.forEach((i, idx) => {
                                const point = landmarks[i];
                                const x = point.x * canvas.width;
                                const y = point.y * canvas.height;

                                if (idx === 0) ctx.moveTo(x, y);
                                else ctx.lineTo(x, y);
                            });
                            ctx.closePath();
                            ctx.fillStyle = color;
                            ctx.globalAlpha = 0.5;
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        }

                        activeRegions.forEach((region) => {
                            drawRegion(FACE_REGIONS[region as keyof typeof FACE_REGIONS], REGION_COLORS[region]);
                        });

                        // drawingUtils.drawConnectors(
                        //   landmarks,
                        //   FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                        //   { color: "gray", lineWidth: 0.5 }
                        // );
                        ctx.fillStyle = "white";
                        ctx.font = "14px Arial";
                        ctx.textAlign = "left";
                        ctx.textBaseline = "middle";

                        landmarks.forEach((point, index) => {
                            const x = point.x * canvas.width;
                            const y = point.y * canvas.height;

                            ctx.beginPath();
                            ctx.arc(x, y, 2, 0, Math.PI * 2);
                            ctx.fill();

                            // ctx.fillText(index.toString(), x + 4, y);

                        });
                    }
                }

                requestAnimationFrame(detect);
            }

            detect();
        }

        init();

        return () => {
            running = false;
        };
    }, []);

    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
    const [open, setOpen] = useState(false)
    const [errorTitle, setErrorTitle] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function analyzeFace() {
        if (!uploadedFile) {
            setOpen(true);
            setErrorTitle("No Image Selected");
            setErrorMessage("Please upload an image first.");
            return;
        }

        setLoading(true);
        setIsAnalyzing(true);

        setCapturedImage(URL.createObjectURL(uploadedFile));

        const formData = new FormData();
        formData.append("image", uploadedFile);
        formData.append("token", "pnVpcjknhPa33NqSsqI2dtG1JiNLug");

        console.log(formData.get("image"));

        const res = await fetch(`http://127.0.0.1:8000/api/analyze`, {
            method: "POST",
            body: formData,
            headers: {
                "auth": "TEQHpT8XulDkvKe7hbg6P9dT8gytVV"
            }
        });

        if (!res.ok) {

            if (res.status === 429) {
                const errorData = await res.json().catch(() => null);

                setOpen(true);
                setErrorTitle(errorData?.title || "Too Many Requests");
                setErrorMessage(
                    errorData?.message ||
                    "You have made too many requests. Please wait before trying again."
                );

                setLoading(false);
                return;
            }

            if (res.status === 400) {
                const errorData = await res.json().catch(() => null);

                setOpen(true);
                setErrorTitle(errorData?.title || "Invalid Token");
                setErrorMessage(
                    errorData?.message ||
                    "Invalid or missing token. Please try again with a valid token."
                );

                setLoading(false);
                setIsAnalyzing(false);
                return;
            }

            setOpen(true);
            setErrorTitle("Server Error");
            setErrorMessage("Something went wrong. Please try again.");

            setLoading(false);
            setIsAnalyzing(false);
            return;
        }

        const result = await res.json();

        if (result.status === "processing") {
            setLoading(true);
            setIsAnalyzing(true);
            return;
        }

        if (result.status === "failed") {
            setLoading(false);
            setIsAnalyzing(false);
            console.error("Analysis failed");
            return;
        }

        if (result.status === "completed") {
            setAnalysis(result.data);
        }

        setLoading(false)
        setIsAnalyzing(false)

        const data = result.data;

        if (!data) {
            console.error("Empty response from server");
            setLoading(false);
            return;
        }

        console.log(data);

        const error = data.error;
        const forehead = data.forehead;
        const left_cheek = data.left_cheek;
        const right_cheek = data.right_cheek;
        const nose = data.nose;
        const chin = data.chin;
        const left_eye_bottom = data.left_eye_bottom;
        const right_eye_bottom = data.right_eye_bottom;
        setAnalysis(data);

        if (error === true) {
            setOpen(true);
            setErrorTitle(data.title);
            setErrorMessage(data.message);
            setLoading(false);
            setIsAnalyzing(false);
            return;
        }

        function changeColor(result: string, name: string) {
            if (result.toLowerCase() === "poor") {
                REGION_COLORS[name] = "rgba(255, 0, 0, 0.5)";
            }
            if (result.toLowerCase() === "medium") {
                REGION_COLORS[name] = "rgba(244, 255, 0, 0.5)";
            }
            if (result.toLowerCase() === "healthy") {
                REGION_COLORS[name] = "rgba(16, 255, 0, 0.5)";
            }
        }

        changeColor(forehead.skin_rating, "forehead")
        changeColor(left_cheek.skin_rating, "left_cheek")
        changeColor(right_cheek.skin_rating, "right_cheek")
        changeColor(nose.skin_rating, "nose")
        changeColor(chin.skin_rating, "chin")
        changeColor(left_eye_bottom.skin_rating, "left_eye_bottom")
        changeColor(right_eye_bottom.skin_rating, "right_eye_bottom")

        // if(forehead.result.toLowerCase() === "poor"){
        //   REGION_COLORS.forehead = "rgba(255,0,0,0.6)";
        // }
        // if(forehead.result.toLowerCase() === "average"){
        //   REGION_COLORS.forehead = "rgba(255,165,0,0.6)";
        // }
        // if(forehead.result.toLowerCase() === "good"){
        //   REGION_COLORS.forehead = "rgba(0,255,0,0.6)";
        // }

        console.log(forehead.result);
        console.log(left_cheek.result);
        console.log(right_cheek.result);
        console.log(nose.result);
        console.log(chin.result);
        console.log(left_eye_bottom.result);
        console.log(right_eye_bottom.result);

    }

    function captureImageBase64(): string {
        const video = videoRef.current!;
        const canvas = document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL("image/jpeg", 0.85);
    }


    useEffect(() => {
        const canvas = document.getElementById("skinRadarChart") as HTMLCanvasElement | null;
        if (!canvas) return;

        const chart = new Chart(canvas, {
            type: "radar",
            data: {
                labels: [
                    "Forehead",
                    "Left Cheek",
                    "Right Cheek",
                    "Nose",
                    "Left Eye Bag",
                    "Right Eye Bag",
                    "Chin"
                ],
                datasets: [
                    {
                        label: "Skin Score",
                        data: [
                            analysis?.forehead?.rating ?? 0,
                            analysis?.left_cheek?.rating ?? 0,
                            analysis?.right_cheek?.rating ?? 0,
                            analysis?.nose?.rating ?? 0,
                            analysis?.left_eye_bottom?.rating ?? 0,
                            analysis?.right_eye_bottom?.rating ?? 0,
                            analysis?.chin?.rating ?? 0
                        ],
                        backgroundColor: "rgba(59,130,246,0.2)",
                        borderColor: "#3b82f6",
                        borderWidth: 3,
                        pointBackgroundColor: "#3b82f6"
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        return () => chart.destroy();
    }, [analysis]);

    useEffect(() => {
        if (!capturedImage) return;

        async function detectImage() {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                runningMode: "IMAGE",
                numFaces: 1
            });

            const img = imageRef.current!;
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext("2d")!;

            await new Promise((resolve) => {
                if (img.complete) resolve(true);
                else img.onload = () => resolve(true);
            });

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const results = faceLandmarker.detect(img);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (results.faceLandmarks) {
                for (const landmarks of results.faceLandmarks) {

                    function drawRegion(indices: number[], color: string) {
                        ctx.beginPath();
                        indices.forEach((i, idx) => {
                            const point = landmarks[i];
                            const x = point.x * canvas.width;
                            const y = point.y * canvas.height;

                            if (idx === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        });
                        ctx.closePath();
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 0.5;
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }

                    activeRegions.forEach((region) => {
                        drawRegion(
                            FACE_REGIONS[region as keyof typeof FACE_REGIONS],
                            REGION_COLORS[region]
                        );
                    });

                    ctx.fillStyle = "white";

                    landmarks.forEach((point) => {
                        const x = point.x * canvas.width;
                        const y = point.y * canvas.height;

                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            }
        }

        detectImage();
    }, [capturedImage, analysis]);

    return (

        <>
            <div className="font-sans">
                <Dialog open={open} onClose={setOpen} className="relative z-50">
                    <DialogBackdrop
                        transition
                        className="fixed inset-0 bg-gray-900/60 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
                    />

                    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <DialogPanel
                                transition
                                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
                            >
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                                            <ExclamationTriangleIcon aria-hidden="true" className="size-6 text-red-600" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                                                {errorTitle}
                                            </DialogTitle>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    {errorMessage}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="inline-flex w-full justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                                    >
                                        Okay
                                    </button>
                                </div>
                            </DialogPanel>
                        </div>
                    </div>
                </Dialog>

                <div className="flex justify-start w-full z-40 pl-8">
                    <PillNav
                        logo={null}
                        items={[
                            { label: 'Camera', href: '/' },
                            { label: 'Upload Image', href: '/upload' },
                        ]}
                        activeHref="/"
                        className="custom-nav pt-4"
                        ease="power2.easeOut"
                        baseColor="#858585"
                        pillColor="#ffffff"
                        hoveredPillTextColor="#ffffff"
                        pillTextColor="#000000"
                        initialLoadAnimation={false}
                        onMobileMenuClick={() => { }}
                    />
                </div>

                <div className="relative flex flex-col md:flex-row gap-6 p-4 md:p-6 h-screen w-full bg-gray-100 overflow-hidden">

                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`w-full md:w-[70%] h-full overflow-hidden relative rounded-3xl shadow-2xl bg-black flex justify-center items-center ring-1 ring-black/5 transition-all ${isDragging ? "ring-4 ring-blue-400 border-2 border-dashed border-blue-400" : ""}`}
                    >

                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-black/60 z-40 flex flex-col items-center justify-center backdrop-blur-sm">
                                <div className="bg-white p-6 rounded-2xl flex flex-col items-center gap-4 shadow-xl">
                                    <Lottie
                                        animationData={loaderAnimation}
                                        loop={true}
                                        style={{ width: 80, height: 80 }}
                                    />
                                    <span className="text-sm font-semibold text-gray-800">
                                        Analyzing your skin...
                                    </span>
                                </div>
                            </div>
                        )}

                        {!capturedImage && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3">
                                <Camera className="w-10 h-10 opacity-60" />
                                <span className="text-sm font-medium">
                                    Drag & Drop your image here
                                </span>
                                <span className="text-xs opacity-70">
                                    or click Upload Image
                                </span>
                            </div>
                        )}

                        {capturedImage && (
                            <img
                                ref={imageRef}
                                src={capturedImage}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-contain z-0"
                            />
                        )}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 h-full w-full object-contain z-10"
                        />

                        {capturedImage && analysis ? (
                            !isAnalyzing && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg hover:scale-105 transition flex items-center gap-2 text-gray-800 font-semibold"
                                >
                                    <RotateCcw className="w-5 h-5" /> Reupload
                                </button>
                            )
                        ) : (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                                {!analysis && (
                                    <>
                                        <label className="bg-white px-4 py-3 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition text-sm font-semibold text-gray-800">
                                            Upload Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setUploadedFile(file);
                                                        setCapturedImage(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                        </label>

                                        <button
                                            onClick={analyzeFace}
                                            disabled={!uploadedFile || loading || open}
                                            className="bg-white px-4 py-3 rounded-xl shadow-lg hover:scale-105 transition text-sm font-semibold text-gray-800 disabled:opacity-50"
                                        >
                                            Analyze
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-[30%] h-full flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden ring-1 ring-gray-200">

                        <div className="p-4 border-b border-gray-100 bg-white shrink-0">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Your Skin Score</h2>
                            <p className="text-xs text-gray-500 mt-1">Detailed analysis of facial features</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {analysis ? (
                                <>
                                    {/* <div className="p-5 pt-0 pb-0">
                    <canvas id="skinRadarChart" height="200"></canvas>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Forehead', key: 'forehead' },
                      { label: 'Left Cheek', key: 'left_cheek' },
                      { label: 'Right Cheek', key: 'right_cheek' },
                      { label: 'Nose', key: 'nose' },
                      { label: 'Left Eye Bag', key: 'left_eye_bottom' },
                      { label: 'Right Eye Bag', key: 'right_eye_bottom' },
                      { label: 'Chin', key: 'chin' },
                    ].map((item) => {
                      const data = analysis[item.key];
                      const rating = data?.rating ?? 0;
                      const issue = data?.issue;
                      const issueText = Array.isArray(issue) ? issue.join(", ") : issue;

                      const progressColor = rating > 80 ? green[500] : rating > 50 ? yellow[700] : "#FF6D6D";

                      return (
                        <div
                          key={item.key}
                          className={`bg-white rounded-xl p-3 pt-10 pb-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${item.key === "chin" ? "md:col-span-2 md:mx-auto md:w-1/2" : ""
                            }`}
                        >
                          <div className="text-center mb-4">
                            <span className="text-xs font-bold tracking-wide text-[15px]">
                              {item.label}
                            </span>
                          </div>

                          <div className="flex justify-center mb-4">
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                              <CircularProgress
                                variant="determinate"
                                value={rating}
                                size={55}
                                thickness={3.5}
                                sx={{ color: progressColor }}
                              />
                              <Box
                                sx={{
                                  top: 0, left: 0, bottom: 0, right: 0,
                                  position: 'absolute',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  component="div"
                                  sx={{ color: '#5A5A5A', fontSize: '0.7rem', fontWeight: 'bold' }}
                                >
                                  {Math.round(rating)}/100
                                </Typography>
                              </Box>
                            </Box>
                          </div>

                          <div className="text-center">
                            <span className="text-xs font-medium text-[#5A5A5A] truncate capitalize">
                              {issueText?.split(',')[0] || "No issues detected"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div> */}

                                    {/* ── Accordions ── */}
                                    <div className="mt-4 flex flex-col gap-2">

                                        {/* Accordion 1 – Skin Recommendations */}
                                        <Accordion
                                            defaultExpanded
                                            disableGutters
                                            elevation={0}
                                            sx={{
                                                border: '1px solid #f0f0f0',
                                                borderRadius: '12px !important',
                                                '&:before': { display: 'none' },
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <AccordionSummary
                                                expandIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: '#6b7280' }} />}
                                                sx={{ minHeight: 48, px: 2, '& .MuiAccordionSummary-content': { my: 1 } }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">🔍</span>
                                                    <span className="text-sm font-bold text-gray-800">Detected Issues</span>
                                                </div>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                                                <ul className="text-xs text-gray-600 space-y-2">
                                                    <div className="p-5 pt-0 pb-0">
                                                        <canvas id="skinRadarChart" height="200"></canvas>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {[
                                                            { label: 'Forehead', key: 'forehead' },
                                                            { label: 'Left Cheek', key: 'left_cheek' },
                                                            { label: 'Right Cheek', key: 'right_cheek' },
                                                            { label: 'Nose', key: 'nose' },
                                                            { label: 'Left Eye Bag', key: 'left_eye_bottom' },
                                                            { label: 'Right Eye Bag', key: 'right_eye_bottom' },
                                                            { label: 'Chin', key: 'chin' },
                                                        ].map((item) => {
                                                            const data = analysis[item.key];
                                                            const rating = data?.rating ?? 0;
                                                            const issue = data?.issue;
                                                            const issueText = Array.isArray(issue) ? issue.join(", ") : issue;

                                                            const progressColor = rating > 80 ? green[500] : rating > 50 ? yellow[700] : "#FF6D6D";

                                                            return (
                                                                <div
                                                                    key={item.key}
                                                                    className={`bg-white rounded-xl p-3 pt-10 pb-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${item.key === "chin" ? "md:col-span-2 md:mx-auto md:w-1/2" : ""
                                                                        }`}
                                                                >
                                                                    <div className="text-center mb-4">
                                                                        <span className="text-xs font-bold tracking-wide text-[15px]">
                                                                            {item.label}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex justify-center mb-4">
                                                                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                                            <CircularProgress
                                                                                variant="determinate"
                                                                                value={rating}
                                                                                size={55}
                                                                                thickness={3.5}
                                                                                sx={{ color: progressColor }}
                                                                            />
                                                                            <Box
                                                                                sx={{
                                                                                    top: 0, left: 0, bottom: 0, right: 0,
                                                                                    position: 'absolute',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                }}
                                                                            >
                                                                                <Typography
                                                                                    variant="caption"
                                                                                    component="div"
                                                                                    sx={{ color: '#5A5A5A', fontSize: '0.7rem', fontWeight: 'bold' }}
                                                                                >
                                                                                    {Math.round(rating)}/100
                                                                                </Typography>
                                                                            </Box>
                                                                        </Box>
                                                                    </div>

                                                                    <div className="text-center">
                                                                        <span className="text-xs font-medium text-[#5A5A5A] truncate capitalize">
                                                                            {issueText?.split(',')[0] || "No issues detected"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </ul>
                                            </AccordionDetails>
                                        </Accordion>

                                        {/* Accordion 2 – Detected Issues */}
                                        <Accordion
                                            defaultExpanded
                                            disableGutters
                                            elevation={0}
                                            sx={{
                                                border: '1px solid #f0f0f0',
                                                borderRadius: '12px !important',
                                                '&:before': { display: 'none' },
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <AccordionSummary
                                                expandIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: '#6b7280' }} />}
                                                sx={{ minHeight: 48, px: 2, '& .MuiAccordionSummary-content': { my: 1 } }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">💡</span>
                                                    <span className="text-sm font-bold text-gray-800">Recomended Products</span>
                                                </div>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {analysis?.products && analysis.products.length > 0 ? (
                                                        analysis.products.map((product: any) => (
                                                            <Card key={product.id} sx={{ maxWidth: 345 }}>
                                                                <CardMedia
                                                                    component="img"
                                                                    height="0"
                                                                    image={`http://127.0.0.1:8000/images/${product.image}`}
                                                                    alt={product.name}
                                                                />
                                                                <CardContent>
                                                                    <Typography gutterBottom variant="h6" component="div">
                                                                        {product.name}
                                                                    </Typography>
                                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                        Recommended for your detected skin concerns.
                                                                    </Typography>
                                                                </CardContent>
                                                                <CardActions>
                                                                    <Button size="small">View</Button>
                                                                </CardActions>
                                                            </Card>
                                                        ))
                                                    ) : (
                                                        <div className="text-center text-gray-400 text-sm py-6">
                                                            No products found for your skin analysis.
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionDetails>
                                        </Accordion>

                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                        <Camera className="w-6 h-6 opacity-50" />
                                    </div>
                                    <p className="text-xs">Take a photo to see your results</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}