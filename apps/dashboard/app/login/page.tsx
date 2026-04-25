import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-brand">SmartFlow AI</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            Admin dashboard login
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enter the configured admin password. Secrets stay on the server.
          </p>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-hot">
            Invalid password.
          </div>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              name="password"
              type="password"
              required
              className="mt-2 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-sky-800"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
