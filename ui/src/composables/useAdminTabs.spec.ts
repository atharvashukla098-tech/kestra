import {describe, it, expect} from "vitest"
import {defineComponent, h} from "vue"
import {useAdminTabs} from "./useAdminTabs"
import {i18nMount} from "../../tests/unit/i18nMount"

const testMessages = {
    main_configuration: "Main Configuration Translated",
    admin_preferences: "Preferences Translated",
    instance: "Instance Translated",
}

function mountAdminTabs(messages = testMessages) {
    let composable!: ReturnType<typeof useAdminTabs>

    const wrapper = i18nMount(
        defineComponent({
            setup() {
                composable = useAdminTabs()
                return () => h("div")
            },
        }),
        {
            messages,
        },
    )

    return {composable, wrapper}
}

describe("useAdminTabs", () => {
    it("returns the tabs in their documented order", () => {
        const {composable} = mountAdminTabs()
        const tabs = composable.adminTabs.value

        expect(tabs).toHaveLength(4)
        expect(tabs.map((tab) => tab.title)).toEqual([
            "Main Configuration Translated",
            "Preferences Translated",
            "Instance Translated",
            "Instance Translated",
        ])
        expect(tabs.map((tab) => tab.name)).toEqual([
            undefined,
            "preferences",
            undefined,
            "instance-ee",
        ])
    })

    it("marks the two header entries with header: true and carries no route", () => {
        const {composable} = mountAdminTabs()
        const tabs = composable.adminTabs.value

        const headerTabs = tabs.filter((tab) => tab.header)
        expect(headerTabs).toHaveLength(2)

        expect(tabs[0].header).toBe(true)
        expect(tabs[0].route).toBeUndefined()
        expect(tabs[0].name).toBeUndefined()

        expect(tabs[2].header).toBe(true)
        expect(tabs[2].route).toBeUndefined()
        expect(tabs[2].name).toBeUndefined()
    })

    it("points the preferences tab at the preferences route", () => {
        const {composable} = mountAdminTabs()
        const tabs = composable.adminTabs.value

        const prefTab = tabs.find((tab) => tab.name === "preferences")
        expect(prefTab).toBeDefined()
        expect(prefTab?.route).toEqual({name: "preferences"})
    })

    it("marks the Enterprise instance tab as locked", () => {
        const {composable} = mountAdminTabs()
        const tabs = composable.adminTabs.value

        const instanceTab = tabs.find((tab) => tab.name === "instance-ee")
        expect(instanceTab).toBeDefined()
        expect(instanceTab?.locked).toBe(true)
        expect(instanceTab?.route).toEqual({name: "admin/instance"})
        expect(instanceTab?.icon).toBeDefined()
    })

    it("ensures every non-header tab has both a name and a route", () => {
        const {composable} = mountAdminTabs()
        const tabs = composable.adminTabs.value

        const actionTabs = tabs.filter((tab) => !tab.header)
        expect(actionTabs).toHaveLength(2)

        for (const tab of actionTabs) {
            expect(tab.name).toBeDefined()
            expect(typeof tab.name).toBe("string")
            expect(tab.route).toBeDefined()
            expect(typeof tab.route).toBe("object")
        }
    })

    it("derives titles from vue-i18n rather than hard-coding them", () => {
        const customMessages = {
            main_configuration: "Config Principale",
            admin_preferences: "Préférences Admin",
            instance: "Mon Instance",
        }

        const {composable} = mountAdminTabs(customMessages)
        const tabs = composable.adminTabs.value

        expect(tabs[0].title).toBe("Config Principale")
        expect(tabs[1].title).toBe("Préférences Admin")
        expect(tabs[2].title).toBe("Mon Instance")
        expect(tabs[3].title).toBe("Mon Instance")
    })
})
