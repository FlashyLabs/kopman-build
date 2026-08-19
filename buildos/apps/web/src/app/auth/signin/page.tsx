import { signIn } from "@/lib/auth"

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-teal-400 tracking-tight">Build OS</h1>
          <p className="mt-2 text-sm text-gray-400">Sign in to your workspace</p>
        </div>

        {searchParams.error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            Authentication failed. Please try again.
          </div>
        )}

        <form
          action={async () => {
            "use server"
            await signIn("flashyid", { redirectTo: searchParams.callbackUrl ?? "/dashboard" })
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 px-4 transition-colors"
          >
            Continue with FlashyID
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Powered by FlashyID · Kopman Build
        </p>
      </div>
    </div>
  )
}
