import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/20">
        <div className="bg-brand px-8 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 font-bold text-white shadow-inner backdrop-blur-sm">
            MW
          </div>
          <h1 className="text-xl font-bold text-white">MoveWell Centers</h1>
          <p className="mt-1 text-sm text-brand-100">Manager Dashboard Login</p>
        </div>

        <div className="p-8">
          {params.error ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Invalid password. Please try again.
            </div>
          ) : null}

          <form action={loginAction} className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Admin Password
              </span>
              <input
                name="password"
                type="password"
                required
                placeholder="Enter your dashboard password"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              Sign into Dashboard
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
