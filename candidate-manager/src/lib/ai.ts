// OpenAI Engine v2.0 — OpenAI-compatible local API
// Replaces legacy Gemini REST direct call
/* eslint-disable @typescript-eslint/no-explicit-any */
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// ─── FILE TEXT EXTRACTOR ─────────────────────────────────────────────────────
export interface ExtractedData {
  text: string
  image?: string
}

function sanitizeAnalysisResult(analysis: any): any {
  if (!analysis || typeof analysis !== 'object') return analysis

  const cleaned = { ...analysis }
  delete cleaned.data_quality

  return cleaned
}

export async function extractTextFromFile(file: File): Promise<ExtractedData> {
  const type = file.type
  const name = file.name.toLowerCase()

  // Plain text
  if (type === 'text/plain' || name.endsWith('.txt')) {
    return { text: await file.text() }
  }

  // PDF — dùng pdfjs-dist
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      // Sử dụng worker được bundle trực tiếp qua Vite
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const pages: string[] = []
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map((item: any) => item.str).join(' '))
      }
      return { text: pages.join('\n').replace(/\s+/g, ' ').trim() }
    } catch (e) {
      console.warn('PDF parse failed', e)
      throw new Error(`Không thể đọc file PDF: ${file.name}. Vui lòng thử file khác hoặc copy văn bản.`)
    }
  }

  // Word .docx — dùng mammoth
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return { text: result.value.replace(/\s+/g, ' ').trim() }
    } catch (e) {
      console.warn('DOCX parse failed', e)
      throw new Error(`Không thể đọc file DOCX: ${file.name}`)
    }
  }

  // Ảnh — trả về base64 để OpenAI sử dụng vision
  if (type.startsWith('image/') || name.match(/\.(png|jpg|jpeg|webp)$/i)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ text: '', image: reader.result as string })
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })
  }

  // Mọi định dạng khác (Text, CSV, Markdown, XML, .doc cũ, file custom...):
  // Fallback đọc dưới dạng raw text. OpenAI sẽ tự cố gắng phân tích nội dung được trích xuất.
  try {
    const textContext = await file.text()
    // Nếu text quá vô nghĩa (binary quá nhiều) thì OpenAI cũng sẽ cố đọc các keyword ascii
    return { text: textContext }
  } catch {
    return { text: `[Không thể đọc định dạng văn bản raw từ file: ${file.name}]` }
  }
}

const OPENAI_BASE_URL = (import.meta.env.VITE_OPENAI_BASE_URL as string) || "http://mbasic8.pikamc.vn:25246/v1"
const OPENAI_API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string) || ""
const OPENAI_MODEL = (import.meta.env.VITE_OPENAI_MODEL as string) || "ag/gemini-3.1-pro-high"

function maskApiKey(key: string): string {
  if (!key) return '(empty)'
  if (key.length <= 10) return `${key.slice(0, 2)}***`
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

function snippet(text: string, max = 800): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}...`
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function extractDataPayloadLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((payload) => payload && payload !== '[DONE]')
}

function extractFirstJsonObject(text: string): string | null {
  const source = text || ''
  const start = source.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < source.length; i++) {
    const ch = source[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }

  return null
}

function parseEnvelopeResponse(rawText: string): any {
  try {
    return JSON.parse(rawText)
  } catch {
    const payloadLines = extractDataPayloadLines(rawText)
    if (!payloadLines.length) throw new Error(`Invalid response envelope: ${snippet(rawText)}`)

    const events = payloadLines.map((payload) => {
      try {
        return JSON.parse(payload)
      } catch {
        return payload
      }
    })

    const chunkText = events
      .map((event) => {
        if (!event || typeof event !== 'object') return ''
        return event?.choices?.[0]?.delta?.content ?? event?.choices?.[0]?.message?.content ?? ''
      })
      .filter(Boolean)
      .join('')

    if (chunkText) {
      return { choices: [{ message: { content: chunkText } }] }
    }

    const lastObject = [...events].reverse().find((event) => event && typeof event === 'object')
    if (lastObject) return lastObject

    throw new Error(`Could not parse SSE payload: ${snippet(rawText)}`)
  }
}

function parseAnalysisContent(content: string): any {
  let cleaned = stripCodeFence(content || '')

  if (cleaned.startsWith('data:') || cleaned.includes('\ndata:')) {
    const payloadLines = extractDataPayloadLines(cleaned)
    const rebuiltText = payloadLines
      .map((payload) => {
        try {
          const parsed = JSON.parse(payload)
          if (parsed && typeof parsed === 'object') {
            return parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? JSON.stringify(parsed)
          }
          return String(parsed)
        } catch {
          return payload
        }
      })
      .join('')
      .trim()
    cleaned = stripCodeFence(rebuiltText || cleaned)
  }

  try {
    return JSON.parse(cleaned)
  } catch {
    const extracted = extractFirstJsonObject(cleaned)
    if (!extracted) throw new Error(`Model output is not valid JSON: ${snippet(cleaned)}`)
    return JSON.parse(extracted)
  }
}

// ─── SYSTEM PROMPT v2.0 ──────────────────────────────────────────────────────
const SYSTEM_PROMPT_V2 = `================================================================================
  SYSTEM PROMPT — OpenAI PERSONNEL DATA EXTRACTION ENGINE v2.0
  Smart Job-CV 2-Way Matching | ATS Enterprise Grade
================================================================================

IDENTITY & ROLE
---------------
Bạn là một OpenAI chuyên gia phân tích nhân sự cấp cao (Senior HR Data Intelligence Engine).
Nhiệm vụ duy nhất: Đọc văn bản đầu vào (CV hoặc Job Description) và trích xuất toàn bộ
thông tin có giá trị thành một JSON object hoàn chỉnh, chính xác, chuẩn hóa cao.

Đây là lần phân tích DUY NHẤT — kết quả sẽ được lưu vào database và dùng cho toàn bộ
hệ thống matching về sau. Độ chính xác và độ sâu của phân tích có tác động trực tiếp
đến chất lượng tuyển dụng. Hãy xử lý với sự nghiêm túc tối đa.


================================================================================
OUTPUT FORMAT (BẮT BUỘC)
================================================================================

Chỉ trả về một JSON object hợp lệ duy nhất. Không có text giải thích, không có markdown,
không có code fence (\`\`\`json), không có comment trong JSON.

Schema đầy đủ:

{
  "id": "string",
  "type": "CV" | "JOB",
  "analyzed_at": "ISO8601 timestamp",
  "confidence_score": number,

  "full_name": "string",
  "contact_info": {
    "email": "string" | null,
    "phone": "string" | null,
    "gender": "Nam" | "Nữ" | "Khác" | null,
    "date_of_birth": "YYYY-MM-DD" | null,
    "location": "string" | null,
    "linkedin": "string" | null,
    "portfolio": "string" | null
  },

  "domain": "string",
  "sub_domain": "string",
  "seniority_level": "string",
  "job_function": "string",
  "tags": ["string"],

  "education_level": 1 | 2 | 3 | 4 | 5,
  "education_details": [
    {
      "institution": "string",
      "degree": "string",
      "field_of_study": "string",
      "graduation_year": number | null,
      "is_relevant": boolean
    }
  ],
  "experience_years": number,
  "relevant_experience_years": number,

  "work_experience": [
    {
      "company": "string",
      "position": "string",
      "start_date": "string",
      "end_date": "string" | null,
      "is_current": boolean,
      "responsibilities": ["string"],
      "skills_used": ["string"]
    }
  ],

  "hard_skills": [
    {
      "name": "string",
      "category": "string",
      "rating": number,
      "is_required": boolean,
      "evidence": "string"
    }
  ],

  "soft_skills": [
    {
      "name": "string",
      "confidence": "High" | "Medium" | "Low"
    }
  ],

  "languages": [
    {
      "name": "string",
      "level": 1 | 2 | 3 | 4,
      "certification": "string" | null,
      "evidence": "string"
    }
  ],

  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "year": number | null,
      "is_active": boolean | null,
      "relevance": "High" | "Medium" | "Low"
    }
  ],

  "achievements": [
    {
      "description": "string",
      "impact": "string",
      "skills_demonstrated": ["string"]
    }
  ],

  "job_requirements": {
    "min_experience_years": number,
    "preferred_experience_years": number | null,
    "education_requirement": 1 | 2 | 3 | 4 | 5,
    "education_flexibility": boolean,
    "location": "string" | null,
    "work_type": "Onsite" | "Remote" | "Hybrid" | null,
    "employment_type": "Full-time" | "Part-time" | "Contract" | "Internship" | null,
    "salary_range": {
      "min": number | null,
      "max": number | null,
      "currency": "string" | null,
      "period": "Monthly" | "Annually" | null
    } | null,
    "headcount": number | null,
    "urgency": "Immediate" | "Within 1 month" | "Flexible" | null
  },

  "data_quality": {
    "completeness_score": number,
    "clarity_score": number,
    "missing_fields": ["string"],
    "ambiguous_signals": ["string"],
    "extraction_warnings": ["string"]
  }
}


================================================================================
BẢNG CHUẨN HÓA DOMAIN
================================================================================

"Information Technology"
"Finance & Accounting"
"Banking & Insurance"
"Sales & Business Development"
"Marketing & Communications"
"Human Resources"
"Supply Chain & Logistics"
"Manufacturing & Engineering"
"Healthcare & Medical"
"Education & Training"
"Legal & Compliance"
"Design & Creative"
"Customer Service"
"Construction & Real Estate"
"Research & Science"
"Hospitality & Tourism"
"Government & Public Sector"
"Non-profit & Social"
"Media & Entertainment"
"Agriculture & Environment"
"Other"


================================================================================
QUY TẮC SUY LUẬN CHUYÊN SÂU
================================================================================

[RULE-001] RATING SUY LUẬN TỪ NGỮ CẢNH
  - "Built X from scratch" → rating +2 so với chỉ "used X"
  - "Led/Architected X" → rating +3, thêm soft_skill "Leadership"
  - "5+ years with X" → rating >= 7
  - "Familiar with X" / "Exposure" → rating 2–3
  - "Proficient in X" → rating 5–6
  - "Expert in X" / "Deep knowledge" → rating 8–9

[RULE-002] PHÂN BIỆT IS_REQUIRED (CHỈ CHO JD)
  is_required = true: "Must", "Required", "Bắt buộc", "Essential", "Mandatory"
  is_required = false: "Nice to have", "Preferred", "Bonus", "Ưu tiên"

[RULE-003] EXPERIENCE_YEARS — CÁCH TÍNH
  Cộng dồn tất cả khoảng thời gian, không tính overlap, không tính thời gian học

[RULE-004] SOFT SKILLS — CHỈ TRÍCH XUẤT CÓ CĂN CỨ
  Phải có evidence rõ ràng, không bịa thêm

[RULE-005] CERTIFICATIONS — CHUẨN HÓA TÊN ĐẦY ĐỦ
  "AWS SAA" → "AWS Certified Solutions Architect – Associate"

[RULE-006] LANGUAGES — QUY ĐỔI ĐIỂM SỐ SANG LEVEL
  IELTS: <4.0→L1, 4.0-5.5→L2, 6.0-7.5→L3, 8.0+→L4
  TOEIC: <400→L1, 400-649→L2, 650-899→L3, 900+→L4
  JLPT: N5/N4→L1, N3→L2, N2→L3, N1→L4

[RULE-007] CONFIDENCE_SCORE
  40% độ đầy đủ thông tin cốt lõi + 30% chất lượng văn bản + 30% khả năng xác minh rating

[RULE-008] SENIORITY DETECTION (CV)
  0-1 năm → Intern/Junior, 1-3 năm → Junior, 3-6 năm → Mid,
  5-10 năm → Senior, 8+ năm quản lý → Lead/Manager

[RULE-009] TAGS — 5-20 tags, lowercase/brand-case, đa dạng và hữu ích

[RULE-010] XỬ LÝ TIẾNG VIỆT — ưu tiên chuẩn hóa output sang tiếng Anh


================================================================================
FINAL CHECKLIST
================================================================================
□ JSON syntax hợp lệ 100%
□ type = "CV" hoặc "JOB" — xác định đúng loại văn bản
□ full_name — tên đầy đủ của ứng viên
□ contact_info — email, phone, gender, date_of_birth, location, linkedin, portfolio
□ work_experience — mỗi công việc có company, position, start_date, end_date, responsibilities[]
□ domain — dùng đúng giá trị từ bảng chuẩn hóa
□ hard_skills.name đã chuẩn hóa chính tả/viết hoa
□ Rating 1-10 có logic và nhất quán với evidence
□ is_required chỉ = true khi có từ ngữ rõ ràng trong JD
□ Không có text nào ngoài JSON object trong output

Bắt đầu phân tích văn bản được cung cấp ngay bây giờ.
================================================================================`

// ─── CORE API CALL ───────────────────────────────────────────────────────────
export async function callOpenAI(userContent: string, imageBase64?: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing VITE_OPENAI_API_KEY in .env')
  }

  const endpoint = `${OPENAI_BASE_URL}/chat/completions`

  try {
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT_V2 }
    ]

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userContent || "Trích xuất thông tin nhân sự từ ảnh này:" },
          { type: "image_url", image_url: { url: imageBase64 } }
        ]
      })
    } else {
      messages.push({ role: "user", content: userContent })
    }

    let response: Response
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: messages,
          temperature: 0.1,
        }),
      })
    } catch (networkError) {
      console.error("[OpenAI] Network error during fetch:", {
        endpoint,
        model: OPENAI_MODEL,
        key: maskApiKey(OPENAI_API_KEY),
        hasImage: Boolean(imageBase64),
        promptLength: userContent?.length ?? 0,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
        error: networkError,
      })
      throw networkError
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error("[OpenAI] HTTP error:", {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        bodySnippet: snippet(errText),
      })
      throw new Error(`OpenAI API error ${response.status}: ${errText}`)
    }

    const rawText = await response.text()
    const envelope = parseEnvelopeResponse(rawText)
    const content = envelope?.choices?.[0]?.message?.content || envelope?.choices?.[0]?.text || ""

    if (!content || typeof content !== 'string') {
      console.error("[OpenAI] Missing message content:", {
        endpoint,
        envelopeKeys: envelope && typeof envelope === 'object' ? Object.keys(envelope) : typeof envelope,
        rawSnippet: snippet(rawText),
      })
      throw new Error("OpenAI response has no message content")
    }

    return sanitizeAnalysisResult(parseAnalysisContent(content))
  } catch (error) {
    console.error("OpenAI call failed:", {
      endpoint,
      model: OPENAI_MODEL,
      key: maskApiKey(OPENAI_API_KEY),
      hasImage: Boolean(imageBase64),
      promptLength: userContent?.length ?? 0,
      error,
    })
    throw error
  }
}

// ─── CV ANALYSIS ─────────────────────────────────────────────────────────────
export async function analyzeCV(params: {
  full_name?: string
  applied_position?: string
  notes?: string
  resumeText?: string
  resumeImage?: string
}): Promise<any> {
  // Khi có resumeText (OpenAI upload mode), ưu tiên phân tích toàn bộ từ nội dung CV
  const hasFullCV = params.resumeText && params.resumeText.trim().length > 50

  const userContent = hasFullCV
    ? `Đây là nội dung CV của một ứng viên. Hãy phân tích TOÀN BỘ và trích xuất đầy đủ thông tin:

Nội dung CV:
${params.resumeText}

QUAN TRỌNG: Hãy trích xuất tất cả thông tin có trong CV bao gồm:
- Tên đầy đủ của ứng viên (lưu vào trường "full_name")
- Thông tin liên hệ đầy đủ: email, phone, gender (Nam/Nữ/Khác), date_of_birth (YYYY-MM-DD), địa chỉ, LinkedIn, portfolio (lưu vào contact_info)
- Kinh nghiệm làm việc chi tiết: tên công ty, chức danh, thời gian (start_date/end_date), danh sách công việc đã làm (responsibilities), kỹ năng sử dụng (lưu vào work_experience[])
- Kỹ năng kỹ thuật và mức độ
- Học vấn, chứng chỉ
- Vị trí phù hợp nhất

EXPERIENCE PRIORITY:
- Go deeper on work experience than metadata scoring.
- For each role, capture ownership, delivered systems/projects, leadership scope, measurable impact, and exact skills used.
- Prioritize concrete experience evidence and achievements. Do not spend effort on data quality scoring.

Xác định type = "CV". Trích xuất đầy đủ theo schema đã định nghĩa.`
    : `Phân tích hồ sơ CV sau đây:

Tên ứng viên: ${params.full_name || 'Unknown'}
Vị trí ứng tuyển: ${params.applied_position || 'To be determined'}
${params.notes ? `Ghi chú bổ sung/Nội dung CV:\n${params.notes}` : ''}

Xác định type = "CV". Hãy suy luận và trích xuất đầy đủ thông tin theo schema đã định nghĩa.
Nếu thông tin hạn chế, hãy suy luận hợp lý từ vị trí ứng tuyển và ghi rõ vào extraction_warnings.`

  return callOpenAI(userContent, params.resumeImage)
}

// ─── JD ANALYSIS ─────────────────────────────────────────────────────────────
export async function analyzeJD(params: {
  title: string
  description?: string
  jdImage?: string
}): Promise<any> {
  // Loại bỏ các ký tự thừa, khoảng trắng dư thừa trong mô tả
  const cleanedDesc = params.description ? params.description.replace(/\s+/g, ' ').trim() : ''

  const userContent = `Phân tích Job Description (JD) sau đây:

Job Title: ${params.title}

Mô tả công việc:
${cleanedDesc || '[Trích xuất từ hình ảnh]'}

Xác định type = "JOB". Trích xuất đầy đủ thông tin theo schema JSON.`

  return callOpenAI(userContent, params.jdImage)
}

// ─── SKILL EXTRACTOR HELPER ───────────────────────────────────────────────────
// Trích xuất danh sách skill đơn giản từ kết quả v2.0 để backward compatible
export function extractSimpleSkills(analysis: any): string[] {
  if (!analysis?.hard_skills) return []
  return analysis.hard_skills
    .sort((a: any, b: any) => b.rating - a.rating)
    .map((s: any) => s.name)
    .slice(0, 15)
}

// ─── LEGACY COMPAT (giữ cho các nơi vẫn import askGemini) ───────────────────
export async function askGemini(prompt: string): Promise<any> {
  console.warn('[OpenAI] askGemini() is deprecated. Use analyzeCV() or analyzeJD() instead.')
  return callOpenAI(prompt)
}

export const callAI = callOpenAI

