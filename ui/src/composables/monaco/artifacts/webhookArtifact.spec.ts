import {describe, expect, it} from "vitest"
import {webhookArtifactProvider} from "./webhookArtifact"
import {provideEditorArtifacts, ARTIFACT_COPY_COMMAND, type ArtifactBlock, type EditorArtifactContext} from "./editorArtifacts"
import {WEBHOOK_TRIGGER_TYPE} from "../../../utils/webhook"

const mockContext: EditorArtifactContext = {
    namespace: "io.kestra.tests",
    id: "webhook-test-flow",
    t: (key: string) => key,
}

describe("webhookArtifactProvider", () => {
    it("matches the canonical webhook trigger type", () => {
        expect(webhookArtifactProvider.type).toBe(WEBHOOK_TRIGGER_TYPE)
        expect(webhookArtifactProvider.type).toBe("io.kestra.plugin.core.trigger.Webhook")
    })

    it("produces the expected artifact shape for a matched trigger", () => {
        const block: ArtifactBlock = {
            type: WEBHOOK_TRIGGER_TYPE,
            value: {id: "my-webhook", type: WEBHOOK_TRIGGER_TYPE, key: "secret-token-123"},
            range: [10, 50, 50],
            path: "triggers",
        }

        const artifacts = webhookArtifactProvider.provide(block, mockContext)

        expect(artifacts).toHaveLength(1)
        expect(artifacts[0]).toEqual({
            title: "webhook.copy_url",
            command: {
                id: ARTIFACT_COPY_COMMAND,
                arguments: [
                    {
                        text: expect.stringContaining("/executions/webhook/io.kestra.tests/webhook-test-flow/secret-token-123"),
                        message: "webhook link copied",
                    },
                ],
            },
        })
    })

    it("handles numeric keys by converting them to strings", () => {
        const block: ArtifactBlock = {
            type: WEBHOOK_TRIGGER_TYPE,
            value: {id: "num-webhook", type: WEBHOOK_TRIGGER_TYPE, key: 98765},
            range: [0, 10, 10],
            path: "triggers",
        }

        const artifacts = webhookArtifactProvider.provide(block, mockContext)

        expect(artifacts).toHaveLength(1)
        const [arg] = artifacts[0].command.arguments as [{text: string; message: string}]
        expect(arg.text).toContain("/executions/webhook/io.kestra.tests/webhook-test-flow/98765")
    })

    it("handles triggers missing a key rather than throwing", () => {
        const blockWithoutKey: ArtifactBlock = {
            type: WEBHOOK_TRIGGER_TYPE,
            value: {id: "no-key-trigger", type: WEBHOOK_TRIGGER_TYPE},
            range: [0, 10, 10],
            path: "triggers",
        }

        expect(webhookArtifactProvider.provide(blockWithoutKey, mockContext)).toEqual([])

        const blockWithEmptyValue: ArtifactBlock = {
            type: WEBHOOK_TRIGGER_TYPE,
            value: {},
            range: [0, 10, 10],
            path: "triggers",
        }
        expect(webhookArtifactProvider.provide(blockWithEmptyValue, mockContext)).toEqual([])

        const blockWithInvalidKeyType: ArtifactBlock = {
            type: WEBHOOK_TRIGGER_TYPE,
            value: {key: {nested: "invalid"}},
            range: [0, 10, 10],
            path: "triggers",
        }
        expect(webhookArtifactProvider.provide(blockWithInvalidKeyType, mockContext)).toEqual([])
    })

    it("yields nothing when block path is not 'triggers'", () => {
        const nonTriggerBlock: ArtifactBlock = {
            type: WEBHOOK_TRIGGER_TYPE,
            value: {id: "webhook", key: "my-key"},
            range: [0, 10, 10],
            path: "tasks",
        }

        expect(webhookArtifactProvider.provide(nonTriggerBlock, mockContext)).toEqual([])
    })

    it("yields nothing when namespace or flow id is missing from context", () => {
        const block: ArtifactBlock = {
            type: WEBHOOK_TRIGGER_TYPE,
            value: {id: "webhook", key: "my-key"},
            range: [0, 10, 10],
            path: "triggers",
        }

        expect(webhookArtifactProvider.provide(block, {...mockContext, namespace: undefined})).toEqual([])
        expect(webhookArtifactProvider.provide(block, {...mockContext, id: undefined})).toEqual([])
    })

    it("yields nothing for a source with no triggers when resolved through provideEditorArtifacts", () => {
        const emptyBlocks: ArtifactBlock[] = []
        expect(provideEditorArtifacts(emptyBlocks, mockContext)).toEqual([])
    })

    it("ignores non-webhook trigger types when resolved through provideEditorArtifacts", () => {
        const otherTriggerBlock: ArtifactBlock = {
            type: "io.kestra.plugin.core.trigger.Schedule",
            value: {id: "schedule", cron: "* * * * *"},
            range: [0, 20, 20],
            path: "triggers",
        }

        expect(provideEditorArtifacts([otherTriggerBlock], mockContext)).toEqual([])
    })
})
