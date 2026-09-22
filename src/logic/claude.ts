import Anthropic from "@anthropic-ai/sdk"

// dangerouslyAllowBrowser ships this key inside the extension's own bundle, readable by
// anyone who inspects/unpacks it -- fine while this stays local/internal-only, but revisit
// before this extension goes to other people (proxy the call through a small backend instead).
const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
})

export async function askClaude(prompt: string): Promise<string> {
    const message = await client.messages.create({
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
        model: "claude-opus-5",
    })

    return message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
}

// Uploads a file via the Files API, then references it by file_id in the message instead of
// inlining base64 -- images and PDFs/text documents use the same { type: "file", file_id }
// source shape, just wrapped in an "image" vs "document" content block.
export async function askClaudeWithFile(prompt: string, file: File): Promise<string> {
    const uploaded = await client.files.upload({ file })
    const source = { type: "file" as const, file_id: uploaded.id }

    const message = await client.messages.create({
        max_tokens: 1024,
        messages: [
            {
                role: "user",
                content: [
                    file.type.startsWith("image/")
                        ? { type: "image" as const, source }
                        : { type: "document" as const, source },
                    { type: "text" as const, text: prompt },
                ],
            },
        ],
        model: "claude-opus-5",
    })

    return message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
}
