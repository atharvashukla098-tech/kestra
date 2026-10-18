import {describe, expect, it} from "vitest"
import {webhookUrl, WEBHOOK_TRIGGER_TYPE, WEBHOOK_TRIGGER_TYPES} from "./webhook"

describe("webhookUrl", () => {
    it("builds an absolute webhook execution URL from namespace, id and key", () => {
        const url = webhookUrl({namespace: "company.team", id: "my-flow", key: "admin1234"})

        expect(url).toMatch(/^https?:\/\//)
        expect(url).toContain("/api/v1/main/executions/webhook/company.team/my-flow/admin1234")
    })

    it("URL-encodes path segments that contain special characters", () => {
        const url = webhookUrl({namespace: "company.team", id: "my flow", key: "key/with/slashes"})

        expect(url).toContain("/executions/webhook/company.team/my%20flow/key%2Fwith%2Fslashes")
    })

    it("exposes the canonical webhook trigger type", () => {
        expect(WEBHOOK_TRIGGER_TYPE).toBe("io.kestra.plugin.core.trigger.Webhook")
    })
})

describe("WEBHOOK_TRIGGER_TYPES", () => {
    it("contains fully qualified trigger class names", () => {
        expect(WEBHOOK_TRIGGER_TYPES.length).toBeGreaterThan(0)
        const fqcnRegex = /^[a-z]+(\.[a-z0-9_]+)+\.[A-Z][a-zA-Z0-9_]*$/

        for (const type of WEBHOOK_TRIGGER_TYPES) {
            expect(type).toMatch(fqcnRegex)
        }
    })

    it("contains no duplicate entries", () => {
        const uniqueEntries = new Set(WEBHOOK_TRIGGER_TYPES)
        expect(uniqueEntries.size).toBe(WEBHOOK_TRIGGER_TYPES.length)
    })

    it("includes the canonical WEBHOOK_TRIGGER_TYPE", () => {
        expect(WEBHOOK_TRIGGER_TYPES).toContain(WEBHOOK_TRIGGER_TYPE)
    })

    it("recognises each listed trigger type as a webhook", () => {
        const isWebhookTrigger = (type: string) => WEBHOOK_TRIGGER_TYPES.includes(type)

        for (const type of WEBHOOK_TRIGGER_TYPES) {
            expect(isWebhookTrigger(type)).toBe(true)
        }
    })

    it("does not treat arbitrary or non-webhook trigger types as webhooks", () => {
        const isWebhookTrigger = (type: string) => WEBHOOK_TRIGGER_TYPES.includes(type)

        expect(isWebhookTrigger("io.kestra.plugin.core.trigger.Schedule")).toBe(false)
        expect(isWebhookTrigger("io.kestra.plugin.core.trigger.Flow")).toBe(false)
        expect(isWebhookTrigger("io.kestra.plugin.core.log.Log")).toBe(false)
        expect(isWebhookTrigger("")).toBe(false)
        expect(isWebhookTrigger("unknown.trigger.Type")).toBe(false)
    })
})
