const BASE_URL = "http://localhost:8000";

export interface EDIProcessResponse {
  filename: string;
  fileId?: string;
  parsed_data: any;
  business_data?: any;
  validation: {
    is_valid: boolean;
    total_errors: number;
    errors: any[];
  };
  summary: any;
  payment_data?: any[];
  enrollment_data?: any[];
}

export interface AIAnalysisResponse {
  ai_explanation: string;
  ai_suggestions: any[];
}

/**
 * Granular: Parse EDI to JSON structure
 */
export async function parseEDI(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${BASE_URL}/parse`, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Parse failed");
    return await response.json();
}

/**
 * Granular: Validate HIPAA structure and business rules
 */
export async function validateEDI(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${BASE_URL}/validate`, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Validation failed");
    return await response.json();
}

/**
 * Granular: Summarize parsed JSON data
 */
export async function summarizeEDI(parsedData: any): Promise<any> {
    const response = await fetch(`${BASE_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
    });
    if (!response.ok) throw new Error("Summarization failed");
    return await response.json();
}

/**
 * Stage 1: Fast Processing (Parse + Validate + Summary) - LEGACY
 */
export async function uploadAndProcessEDI(file: File): Promise<EDIProcessResponse> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${BASE_URL}/process-all`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to process EDI file");
    }

    return await response.json();
  } catch (error: any) {
    throw error;
  }
}

/**
 * Stage 2: AI Deep Analysis (Explanation + Auto-Fix Suggestions)
 */
export async function analyzeEDIWithAI(validationData: any): Promise<AIAnalysisResponse> {
  try {
    const response = await fetch(`${BASE_URL}/analyze-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validationData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "AI Analysis failed");
    }

    return await response.json();
  } catch (error: any) {
    throw error;
  }
}

/**
 * Fetch 834 Enrollment Data
 */
export async function fetch834Data(fileId: string): Promise<any> {
    // Calling assumed backend endpoint, fallback to returning an empty array if failure
    try {
        const response = await fetch(`${BASE_URL}/enrollment/${fileId}`, { method: "GET" });
        if (!response.ok) return []; 
        return await response.json();
    } catch {
        return [];
    }
}

/**
 * Fetch 835/837 Reconciliation Data
 */
export async function fetchReconciliation(fileId: string): Promise<any> {
    try {
        const response = await fetch(`${BASE_URL}/reconciliation/${fileId}`, { method: "GET" });
        if (!response.ok) return [];
        return await response.json();
    } catch {
        return [];
    }
}

/**
 * Reconcile 837 and 835 files
 */
export async function reconcileFiles(file837: File, file835: File): Promise<any> {
    const formData = new FormData();
    formData.append("file_837", file837);
    formData.append("file_835", file835);
    
    const response = await fetch(`${BASE_URL}/reconcile`, {
        method: "POST",
        body: formData
    });
    
    if (!response.ok) {
        throw new Error("Reconciliation failed");
    }
    
    return await response.json();
}

/**
 * 834 Delta Report
 */
export async function fetch834Delta(fileBase: File, fileNew: File): Promise<any> {
    const formData = new FormData();
    formData.append("file_base", fileBase);
    formData.append("file_new", fileNew);

    const response = await fetch(`${BASE_URL}/enrollment-delta`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Failed to generate delta report");
    }

    return await response.json();
}

/**
 * Apply AI Fixes to EDI
 */
export async function applyFixes(fileId: string, suggestions: any[]): Promise<any> {
    const response = await fetch(`${BASE_URL}/apply-fixes?file_id=${fileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suggestions)
    });

    if (!response.ok) {
        throw new Error("Failed to apply fixes");
    }

    return await response.json();
}

/**
 * Ask general EDI questions to the chatbot
 */
export async function askChatbot(question: string): Promise<string> {
    try {
        const response = await fetch(`${BASE_URL}/chatbot-query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });
        
        if (!response.ok) return "I'm having trouble connecting to my AI core right now.";
        const data = await response.json();
        return data.answer || data.error || "I couldn't find an answer to that. Could you rephrase?";
    } catch {
        return "Connection failed. Please check your internet or server status.";
    }
}

/**
 * Cross-check 834 Eligibility against 837 Claims
 */
export async function checkEligibility(file834: File, file837: File): Promise<any[]> {
    const formData = new FormData();
    formData.append("file_834", file834);
    formData.append("file_837", file837);
    
    const response = await fetch(`${BASE_URL}/eligibility-check`, {
        method: "POST",
        body: formData
    });
    
    if (!response.ok) {
        throw new Error("Eligibility check failed");
    }
    
    return await response.json();
}

/**
 * Fetch 835 Payment Summary
 */
export async function getPayment835(fileId: string): Promise<any[]> {
    const response = await fetch(`${BASE_URL}/payment-835/${encodeURIComponent(fileId)}`);
    if (!response.ok) {
        throw new Error("Failed to fetch 835 payment data");
    }
    return await response.json();
}
