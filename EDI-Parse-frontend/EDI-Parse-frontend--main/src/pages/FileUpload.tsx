import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { uploadAndProcessEDI } from "@/lib/api";
import { toast } from "sonner";

const UploadPage = () => {
    const navigate = useNavigate();

    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [ediInput, setEdiInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = (event.target?.result as string) || "";
                setEdiInput(content);
            };
            reader.readAsText(file);
        }
    };

    const handleParse = async () => {
        if (!ediInput && !uploadedFile) return;

        let fileToProcess = uploadedFile;

        if (!fileToProcess && ediInput) {
            fileToProcess = new File([ediInput], "manual_input.edi");
        }

        setIsLoading(true);

        try {
            await uploadAndProcessEDI(fileToProcess!);

            toast.success("EDI Parsed");

            // 🚀 move to dashboard AFTER upload
            navigate("/dashboard", {
                state: {
                    fileName: fileToProcess?.name,
                },
            });

        } catch (err) {
            toast.error("Failed to process file");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">

            <div className="w-full max-w-2xl border-2 border-dashed border-border rounded-2xl p-8 bg-card">

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    className="hidden"
                    accept=".edi,.txt,.x12"
                />

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="text-center cursor-pointer mb-6"
                >
                    <p className="text-lg font-medium">
                        Drop your EDI file here, or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Supports .edi, .txt, .x12 files
                    </p>
                </div>

                <Textarea
                    placeholder="Or paste EDI content..."
                    className="mb-4 font-mono"
                    value={ediInput}
                    onChange={(e) => setEdiInput(e.target.value)}
                />

                <Button
                    onClick={handleParse}
                    disabled={isLoading || (!ediInput && !uploadedFile)}
                    className="w-full"
                >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Parse & Analyze
                </Button>

            </div>
        </div>
    );
};

export default UploadPage;