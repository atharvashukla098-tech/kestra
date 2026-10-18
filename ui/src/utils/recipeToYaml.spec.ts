import {describe, expect, it} from "vitest"
import * as flowYamlUtils from "@kestra-io/topology/flow-yaml-utils"
import {State} from "@kestra-io/design-system"
import {
    recipeToFlowObject,
    recipeToYaml,
    notifyTaskFqcn,
    DEFAULT_CRON,
    DEFAULT_WEBHOOK_KEY,
    DEFAULT_SLACK_CHANNEL,
    DEFAULT_EMAIL_TO,
    DEFAULT_STATES,
    SYSTEM_FLOW_RECIPE_ID,
    type RecipeState,
} from "./recipeToYaml"
import {parseBlock} from "../../tests/unit/utils/parsedBlock"

const baseState = (): RecipeState => ({
    triggerType: "execution",
    watchNamespace: "company.team",
    includeSub: true,
    states: ["FAILED", "WARNING"],
    cron: "0 9 * * *",
    timezone: "Europe/Paris",
    webhookKey: "my-key",
    otherTriggerType: "",
    notify: {slack: false, teams: false, email: false, custom: false},
    slackChannel: "#alerts",
    teamsWebhook: "",
    emailTo: "",
})

describe("recipeToYaml", () => {
    describe("execution trigger", () => {
        it("generates valid YAML with namespace prefix=true for includeSub", () => {
            // Given
            const state = baseState()
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            expect(parsed.namespace).toBe("system")
            const trigger = parsed.triggers[0]
            expect(trigger.type).toBe("io.kestra.plugin.core.trigger.Flow")
            expect(trigger.states).toEqual(["FAILED", "WARNING"])
            expect(trigger.conditions[0].type).toBe("io.kestra.plugin.core.condition.ExecutionNamespace")
            expect(trigger.conditions[0].namespace).toBe("company.team")
            expect(trigger.conditions[0].prefix).toBe(true)
        })

        it("generates prefix=false when includeSub is false", () => {
            // Given
            const state = baseState()
            state.includeSub = false
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            expect(parsed.triggers[0].conditions[0].prefix).toBe(false)
        })

        it("falls back to FAILED and WARNING when states array is empty", () => {
            // Given
            const state = baseState()
            state.states = []
            state.notify.email = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            expect(parsed.triggers[0].states).toEqual(["FAILED", "WARNING"])
        })

        it("omits conditions when watchNamespace is empty", () => {
            // Given
            const state = baseState()
            state.watchNamespace = ""
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            expect(parsed.triggers[0].conditions).toBeUndefined()
        })

        it("uses SlackExecution task (not IncomingWebhook) for execution trigger", () => {
            // Given
            const state = baseState()
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const slackTask = parsed.tasks.find((t: any) => t.id === "notify_slack")
            expect(slackTask?.type).toBe("io.kestra.plugin.slack.notifications.SlackExecution")
            expect(slackTask?.executionId).toBe("{{ trigger.executionId }}")
        })

        it("includes teams and email tasks when enabled", () => {
            // Given
            const state = baseState()
            state.notify.teams = true
            state.notify.email = true
            state.emailTo = "ops@example.com"

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const taskTypes = parsed.tasks.map((t: any) => t.type)
            expect(taskTypes).toContain("io.kestra.plugin.microsoft365.teams.TeamsExecution")
            expect(taskTypes).toContain("io.kestra.plugin.email.MailExecution")
        })

        it("email uses executionFqcn for execution trigger", () => {
            // Given
            const state = baseState()
            state.notify.email = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const emailTask = parsed.tasks.find((t: any) => t.id === "notify_email")
            expect(emailTask?.type).toBe("io.kestra.plugin.email.MailExecution")
            expect(emailTask?.executionId).toContain("trigger.executionId")
        })
    })

    describe("schedule trigger", () => {
        it("uses SlackIncomingWebhook for schedule trigger", () => {
            // Given
            const state = baseState()
            state.triggerType = "schedule"
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const slackTask = parsed.tasks.find((t: any) => t.id === "notify_slack")
            expect(slackTask?.type).toBe("io.kestra.plugin.slack.notifications.SlackIncomingWebhook")
            expect(slackTask?.executionId).toBeUndefined()
        })

        it("slack IncomingWebhook sends messageText, not a channel it cannot honour", () => {
            // Given
            const state = baseState()
            state.triggerType = "schedule"
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const slackTask = parsed.tasks.find((t: any) => t.id === "notify_slack")
            expect(slackTask?.messageText).toContain("flow.id")
            expect(slackTask?.channel).toBeUndefined()
        })

        it("generates schedule trigger with cron and timezone", () => {
            // Given
            const state = baseState()
            state.triggerType = "schedule"
            state.cron = "0 8 * * 1"
            state.timezone = "America/New_York"
            state.notify.email = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const trigger = parsed.triggers[0]
            expect(trigger.type).toBe("io.kestra.plugin.core.trigger.Schedule")
            expect(trigger.cron).toBe("0 8 * * 1")
            expect(trigger.timezone).toBe("America/New_York")
        })

        it("email uses webhookFqcn for non-execution trigger", () => {
            // Given
            const state = baseState()
            state.triggerType = "schedule"
            state.notify.email = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const emailTask = parsed.tasks.find((t: any) => t.id === "notify_email")
            expect(emailTask?.type).toBe("io.kestra.plugin.email.MailSend")
            expect(emailTask?.executionId).toBeUndefined()
            expect(emailTask?.htmlTextContent).not.toContain("trigger.executionId")
        })

        it("custom channel adds an editable Log placeholder task", () => {
            // Given
            const state = baseState()
            state.notify.custom = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const customTask = parsed.tasks.find((t: any) => t.id === "notify_custom")
            expect(customTask?.type).toBe("io.kestra.plugin.core.log.Log")
            expect(customTask?.message).toContain("trigger.executionId")
        })

        it("custom channel is always emitted even when no plugins are installed", () => {
            // Given
            const state = baseState()
            state.notify.slack = true
            state.notify.custom = true

            // When — only the Log fqcn is available, so slack is filtered out
            const yaml = recipeToYaml(state, "system", new Set(["io.kestra.plugin.core.log.Log"]))

            // Then
            const parsed = parseBlock(yaml)
            expect(parsed.tasks.find((t: any) => t.id === "notify_slack")).toBeUndefined()
            expect(parsed.tasks.find((t: any) => t.id === "notify_custom")).toBeDefined()
        })
    })

    describe("webhook trigger", () => {
        it("generates webhook trigger with key", () => {
            // Given
            const state = baseState()
            state.triggerType = "webhook"
            state.webhookKey = "test-key-123"
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const trigger = parsed.triggers[0]
            expect(trigger.type).toBe("io.kestra.plugin.core.trigger.Webhook")
            expect(trigger.key).toBe("test-key-123")
        })

        it("uses IncomingWebhook variant for webhook trigger", () => {
            // Given
            const state = baseState()
            state.triggerType = "webhook"
            state.notify.teams = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            const teamsTask = parsed.tasks.find((t: any) => t.id === "notify_teams")
            expect(teamsTask?.type).toBe("io.kestra.plugin.microsoft365.teams.TeamsIncomingWebhook")
        })
    })

    describe("other trigger", () => {
        it("generates other trigger with provided fqcn", () => {
            // Given
            const state = baseState()
            state.triggerType = "other"
            state.otherTriggerType = "io.kestra.plugin.core.trigger.Polling"
            state.notify.email = true

            // When
            const yaml = recipeToYaml(state, "system")

            // Then
            const parsed = parseBlock(yaml)
            expect(parsed.triggers[0].type).toBe("io.kestra.plugin.core.trigger.Polling")
        })

        it("produces empty triggers array when otherTriggerType is not set", () => {
            // Given
            const state = baseState()
            state.triggerType = "other"
            state.otherTriggerType = ""
            state.notify.slack = true

            // When
            const flowObj = recipeToFlowObject(state, "system")

            // Then
            expect((flowObj.triggers as any[]).length).toBe(0)
        })
    })

    describe("FQCN availability filtering", () => {
        it("omits slack task when its FQCN is not in the available set", () => {
            // Given
            const state = baseState()
            state.notify.slack = true
            state.notify.email = true
            const available = new Set(["io.kestra.plugin.email.MailExecution"])

            // When
            const flowObj = recipeToFlowObject(state, "system", available)

            // Then
            const taskIds = (flowObj.tasks as any[]).map(t => t.id)
            expect(taskIds).not.toContain("notify_slack")
            expect(taskIds).toContain("notify_email")
        })

        it("includes all tasks when availableFqcns is empty (permissive mode)", () => {
            // Given
            const state = baseState()
            state.notify.slack = true
            state.notify.email = true

            // When
            const flowObj = recipeToFlowObject(state, "system", new Set())

            // Then
            const taskIds = (flowObj.tasks as any[]).map(t => t.id)
            expect(taskIds).toContain("notify_slack")
            expect(taskIds).toContain("notify_email")
        })
    })

    describe("round-trip stability", () => {
        it("parse(stringify(x)) produces the same content", () => {
            // Given
            const state = baseState()
            state.notify.slack = true

            // When
            const yaml = recipeToYaml(state, "system")
            const reparsed = parseBlock(yaml)
            const restringified = flowYamlUtils.stringify(reparsed)

            // Then
            const reparsedfinal = parseBlock(restringified)
            expect(reparsedfinal.namespace).toBe(reparsed.namespace)
            expect(reparsedfinal.triggers[0].type).toBe(reparsed.triggers[0].type)
        })

        it("uses the provided systemNamespace for the flow namespace", () => {
            // Given
            const state = baseState()
            state.notify.email = true

            // When
            const yaml = recipeToYaml(state, "custom-system")

            // Then
            const parsed = parseBlock(yaml)
            expect(parsed.namespace).toBe("custom-system")
        })

        it("uses SYSTEM_FLOW_RECIPE_ID as the flow id", () => {
            // Given
            const state = baseState()
            state.notify.email = true

            // When
            const flowObj = recipeToFlowObject(state, "system")

            // Then
            expect(flowObj.id).toBe(SYSTEM_FLOW_RECIPE_ID)
        })
    })
    describe("notify task properties match the plugin schemas", () => {
        const notifyTask = (state: RecipeState, id: string) => {
            const task = parseBlock(recipeToYaml(state, "system")).tasks.find((t: any) => t.id === id)
            if (!task) throw new Error(`The generated flow has no task "${id}".`)
            return task
        }

        it("only sets slack channel where SlackTemplate declares it", () => {
            const execution = baseState()
            execution.notify.slack = true
            expect(notifyTask(execution, "notify_slack").channel).toBe("#alerts")

            const webhook = baseState()
            webhook.triggerType = "webhook"
            webhook.notify.slack = true
            const webhookTask = notifyTask(webhook, "notify_slack")
            expect(webhookTask).not.toHaveProperty("channel")
            expect(Object.keys(webhookTask)).toEqual(
                expect.arrayContaining(["id", "type", "url", "messageText"]),
            )
        })

        it("sends a teams card payload rather than an undeclared message property", () => {
            const state = baseState()
            state.triggerType = "schedule"
            state.notify.teams = true

            const task = notifyTask(state, "notify_teams")
            expect(task.message).toBeUndefined()
            expect(JSON.parse(String(task.payload))["@type"]).toBe("MessageCard")
        })

        it("sends the teams execution id rather than a payload on execution triggers", () => {
            const state = baseState()
            state.notify.teams = true

            const task = notifyTask(state, "notify_teams")
            expect(task.payload).toBeUndefined()
            expect(task.executionId).toContain("trigger.executionId")
        })

        it("declares a single-string recipient and an smtp host on mail tasks", () => {
            const state = baseState()
            state.notify.email = true
            state.emailTo = "ops@example.com"

            const task = notifyTask(state, "notify_email")
            expect(task.to).toBe("ops@example.com")
            expect(Array.isArray(task.to)).toBe(false)
            expect(task.host).toContain("EMAIL_HOST")
            expect(task.port).toBe(465)
        })
    })

    describe("notifyTaskFqcn", () => {
        it("returns the right fully qualified class for each supported channel in execution mode", () => {
            expect(notifyTaskFqcn("slack", true)).toBe("io.kestra.plugin.slack.notifications.SlackExecution")
            expect(notifyTaskFqcn("teams", true)).toBe("io.kestra.plugin.microsoft365.teams.TeamsExecution")
            expect(notifyTaskFqcn("email", true)).toBe("io.kestra.plugin.email.MailExecution")
        })

        it("returns the right fully qualified class for each supported channel in non-execution mode", () => {
            expect(notifyTaskFqcn("slack", false)).toBe("io.kestra.plugin.slack.notifications.SlackIncomingWebhook")
            expect(notifyTaskFqcn("teams", false)).toBe("io.kestra.plugin.microsoft365.teams.TeamsIncomingWebhook")
            expect(notifyTaskFqcn("email", false)).toBe("io.kestra.plugin.email.MailSend")
        })

        it("throws predictably for an unknown notification channel", () => {
            expect(() => notifyTaskFqcn("unknown" as unknown as "slack", true)).toThrow()
            expect(() => notifyTaskFqcn("unknown" as unknown as "slack", false)).toThrow()
        })

        it("ignores unknown channels in RecipeState so YAML does not contain undefined", () => {
            const state = baseState()
            const dirtyNotify = state.notify as unknown as Record<string, boolean>
            dirtyNotify["unknownChannel"] = true
            const yaml = recipeToYaml(state, "system")
            const parsed = parseBlock(yaml)
            expect(yaml).not.toContain("undefined")
            expect((parsed.tasks as Record<string, unknown>[]).some(t => t.id === "notify_unknownChannel")).toBe(false)
        })
    })

    describe("recipe defaults", () => {
        it("DEFAULT_CRON is non-empty and of expected 5-part cron shape", () => {
            expect(DEFAULT_CRON).toBeTruthy()
            expect(typeof DEFAULT_CRON).toBe("string")
            expect(DEFAULT_CRON.trim().split(/\s+/)).toHaveLength(5)
            expect(DEFAULT_CRON).toBe("0 9 * * *")
        })

        it("DEFAULT_WEBHOOK_KEY is non-empty and of expected string shape", () => {
            expect(DEFAULT_WEBHOOK_KEY).toBeTruthy()
            expect(typeof DEFAULT_WEBHOOK_KEY).toBe("string")
            expect(DEFAULT_WEBHOOK_KEY).toBe("my-webhook-key")
        })

        it("DEFAULT_SLACK_CHANNEL is non-empty and starts with a hash", () => {
            expect(DEFAULT_SLACK_CHANNEL).toBeTruthy()
            expect(typeof DEFAULT_SLACK_CHANNEL).toBe("string")
            expect(DEFAULT_SLACK_CHANNEL.startsWith("#")).toBe(true)
            expect(DEFAULT_SLACK_CHANNEL).toBe("#alerts")
        })

        it("DEFAULT_EMAIL_TO is non-empty and formatted as a valid email address", () => {
            expect(DEFAULT_EMAIL_TO).toBeTruthy()
            expect(typeof DEFAULT_EMAIL_TO).toBe("string")
            expect(DEFAULT_EMAIL_TO).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
            expect(DEFAULT_EMAIL_TO).toBe("team@your-domain.com")
        })

        it("DEFAULT_STATES lists real execution states", () => {
            expect(DEFAULT_STATES).toBeDefined()
            expect(Array.isArray(DEFAULT_STATES)).toBe(true)
            expect(DEFAULT_STATES.length).toBeGreaterThan(0)
            for (const state of DEFAULT_STATES) {
                expect(state in State).toBe(true)
                expect((State as Record<string, unknown>)[state]).toBe(state)
            }
            expect(DEFAULT_STATES).toEqual([State.FAILED, State.WARNING])
        })

        it("generates valid YAML for a recipe using empty fields that fallback to defaults", () => {
            const defaultState: RecipeState = {
                triggerType: "execution",
                watchNamespace: "",
                includeSub: false,
                states: [],
                cron: "",
                timezone: "",
                webhookKey: "",
                otherTriggerType: "",
                notify: {slack: true, teams: true, email: true, custom: false},
                slackChannel: "",
                teamsWebhook: "",
                emailTo: "",
            }

            const yaml = recipeToYaml(defaultState, "system")
            expect(yaml).toBeTruthy()
            expect(yaml).not.toContain("undefined")

            const parsed = parseBlock(yaml)
            expect(parsed.id).toBe(SYSTEM_FLOW_RECIPE_ID)
            expect(parsed.namespace).toBe("system")
            expect(parsed.triggers[0].states).toEqual(DEFAULT_STATES)

            const slackTask = (parsed.tasks as Record<string, unknown>[]).find(t => t.id === "notify_slack")
            expect(slackTask?.channel).toBe(DEFAULT_SLACK_CHANNEL)

            const emailTask = (parsed.tasks as Record<string, unknown>[]).find(t => t.id === "notify_email")
            expect(emailTask?.to).toBe(DEFAULT_EMAIL_TO)
        })

        it("generates valid YAML for schedule and webhook triggers using default cron and webhook key", () => {
            const scheduleState: RecipeState = {
                triggerType: "schedule",
                watchNamespace: "",
                includeSub: false,
                states: [],
                cron: "",
                timezone: "",
                webhookKey: "",
                otherTriggerType: "",
                notify: {slack: false, teams: false, email: false, custom: false},
                slackChannel: "",
                teamsWebhook: "",
                emailTo: "",
            }

            const scheduleYaml = recipeToYaml(scheduleState, "system")
            const parsedSchedule = parseBlock(scheduleYaml)
            expect(parsedSchedule.triggers[0].cron).toBe(DEFAULT_CRON)

            const webhookState: RecipeState = {
                ...scheduleState,
                triggerType: "webhook",
            }
            const webhookYaml = recipeToYaml(webhookState, "system")
            const parsedWebhook = parseBlock(webhookYaml)
            expect(parsedWebhook.triggers[0].key).toBe(DEFAULT_WEBHOOK_KEY)
        })
    })
})
