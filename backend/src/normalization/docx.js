import mammoth from "mammoth";

/**
 * Extracts raw text from a DOCX file for inclusion in the LLM prompt.
 */
export async function normalizeDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return { kind: "text", data: value };
}

export default normalizeDocx;
