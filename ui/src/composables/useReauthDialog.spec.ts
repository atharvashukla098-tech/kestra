import {describe, it, expect, vi} from "vitest"
import {confirmReauth, isReauthOpen, recheckReauth, requestReauth, resolveReauth, submitReauth, useReauthDialog} from "./useReauthDialog"

describe("useReauthDialog", () => {
    const signIn = vi.fn().mockResolvedValue(undefined)

    it("shares one dialog between concurrent 401s and settles them all with the same outcome", async () => {
        const first = requestReauth({signIn})
        const second = requestReauth({signIn})
        expect(isReauthOpen()).toBe(true)

        resolveReauth(true)

        await expect(Promise.all([first, second])).resolves.toEqual([true, true])
        expect(isReauthOpen()).toBe(false)
    })

    it("signs in through the handler of the caller that opened the dialog", async () => {
        const opened = requestReauth({signIn})
        requestReauth({signIn: vi.fn()})

        await submitReauth({username: "a", password: "b"})

        expect(signIn).toHaveBeenCalledWith({username: "a", password: "b"})
        resolveReauth(false)
        await opened
    })

    it("offers the password form only when the caller supplies a sign-in", async () => {
        const withoutPassword = requestReauth({loginUrl: "/ui/login"})
        const {canSignInWithPassword, loginUrl} = useReauthDialog()

        expect(canSignInWithPassword.value).toBe(false)
        expect(loginUrl.value).toBe("/ui/login")
        await expect(submitReauth({username: "a", password: "b"})).rejects.toThrow()
        resolveReauth(false)
        await withoutPassword
    })

    it("confirms the session after a successful sign-in and rejects when it cannot be confirmed", async () => {
        const confirm = vi.fn().mockRejectedValueOnce(new Error("not signed in")).mockResolvedValue(undefined)
        const opened = requestReauth({signIn, confirm})

        await expect(submitReauth({username: "a", password: "wrong"})).rejects.toThrow("not signed in")
        await expect(submitReauth({username: "a", password: "right"})).resolves.toBeUndefined()
        expect(confirm).toHaveBeenCalledTimes(2)

        resolveReauth(false)
        await opened
    })

    it("closes on its own when the session comes back while the window was in the background", async () => {
        let signedIn = false
        const opened = requestReauth({loginUrl: "/ui/login", confirm: async () => {
            if (!signedIn) throw new Error("still signed out")
        }})

        await recheckReauth()
        expect(isReauthOpen()).toBe(true)

        signedIn = true
        window.dispatchEvent(new Event("focus"))

        await expect(opened).resolves.toBe(true)
    })

    it("opens a fresh dialog once the previous one is settled", async () => {
        const abandoned = requestReauth({signIn})
        resolveReauth(false)
        await expect(abandoned).resolves.toBe(false)

        const next = requestReauth({signIn})
        expect(isReauthOpen()).toBe(true)
        resolveReauth(true)
        await expect(next).resolves.toBe(true)
    })

    describe("confirmReauth and resolution lifecycle", () => {
        it("confirming resolves truthy and closes the dialog", async () => {
            const confirmFn = vi.fn().mockResolvedValue(undefined)
            const pending = requestReauth({confirm: confirmFn})
            expect(isReauthOpen()).toBe(true)

            await confirmReauth()
            expect(confirmFn).toHaveBeenCalled()

            resolveReauth(true)
            const result = await pending
            expect(result).toBe(true)
            expect(isReauthOpen()).toBe(false)
        })

        it("dismissing resolves falsy and closes the dialog", async () => {
            const pending = requestReauth({loginUrl: "/ui/login"})
            expect(isReauthOpen()).toBe(true)

            resolveReauth(false)
            const result = await pending
            expect(result).toBe(false)
            expect(isReauthOpen()).toBe(false)
        })

        it("a second call while one is pending does not open two dialogs", async () => {
            const first = requestReauth({loginUrl: "/login-1"})
            expect(isReauthOpen()).toBe(true)

            const second = requestReauth({loginUrl: "/login-2"})
            expect(isReauthOpen()).toBe(true)
            expect(first).toBe(second)

            resolveReauth(true)
            await expect(Promise.all([first, second])).resolves.toEqual([true, true])
            expect(isReauthOpen()).toBe(false)
        })

        it("ensures the pending promise is always settled so no caller hangs", async () => {
            const callers = [
                requestReauth({signIn}),
                requestReauth({signIn}),
                requestReauth({signIn}),
            ]

            resolveReauth(false)
            const results = await Promise.all(callers)
            expect(results).toEqual([false, false, false])
            expect(isReauthOpen()).toBe(false)
        })

        it("safely handles confirmReauth when no confirm callback was registered", async () => {
            requestReauth({loginUrl: "/login"})
            await expect(confirmReauth()).resolves.toBeUndefined()
            resolveReauth(false)
        })
    })
})

