import {afterEach, beforeEach, describe, expect, it} from "vitest"
import {setDocumentTitle} from "./documentTitle"

describe("documentTitle", () => {
    let originalTitle: string

    beforeEach(() => {
        originalTitle = document.title
    })

    afterEach(() => {
        document.title = originalTitle
    })

    it("appends page title to base title separated by |", () => {
        document.title = "Kestra"
        setDocumentTitle("Flows")
        expect(document.title).toBe("Flows | Kestra")
    })

    it("replaces existing page title preserving the base title", () => {
        document.title = "Flows | Kestra"
        setDocumentTitle("Executions")
        expect(document.title).toBe("Executions | Kestra")
    })

    it("preserves base title when existing title contains multiple separators", () => {
        document.title = "Task Run | Execution 123 | Kestra"
        setDocumentTitle("Logs")
        expect(document.title).toBe("Logs | Kestra")
    })

    it("restores base title when new title is empty or null", () => {
        document.title = "Flows | Kestra"
        setDocumentTitle("")
        expect(document.title).toBe("Kestra")

        document.title = "Flows | Kestra"
        setDocumentTitle(null)
        expect(document.title).toBe("Kestra")

        document.title = "Flows | Kestra"
        setDocumentTitle("   ")
        expect(document.title).toBe("Kestra")
    })

    it("trims whitespace from the page title", () => {
        document.title = "Kestra"
        setDocumentTitle("  Namespaces  ")
        expect(document.title).toBe("Namespaces | Kestra")
    })

    it("sets page title directly when base title is empty", () => {
        document.title = ""
        setDocumentTitle("Overview")
        expect(document.title).toBe("Overview")
    })
})
