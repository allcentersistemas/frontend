import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2 } from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import { dashboardPath } from '../auth/roles'

import logo from '../assets/allcenter1.png'

export function LoginPage() {
  const { ready, employee, allowedDashboard, login } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (ready && employee && allowedDashboard) {
    return (
        <Navigate
            to={from && from !== '/login'
                ? from
                : dashboardPath(allowedDashboard)}
            replace
        />
    )
  }

  async function onSubmit(e) {
    e.preventDefault()

    setError(null)
    setLoading(true)

    try {
      const dash = await login(email.trim(), password)

      navigate(dashboardPath(dash), {
        replace: true
      })
    } catch (err) {
      setError(
          err instanceof Error
              ? err.message
              : 'No se pudo iniciar sesión'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="
      min-h-screen
      flex
      items-center
      justify-center
      bg-gradient-to-br
      from-[#0f0f0f]
      via-[#1a1a1a]
      to-[#111827]
      px-4
      relative
      overflow-hidden
    ">

        {/* Glow effects */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10">

          <div className="
          backdrop-blur-2xl
          bg-white/5
          border
          border-yellow-400/10
          rounded-3xl
          shadow-2xl
          shadow-yellow-500/10
          p-10
        ">

            {/* Logo */}
            <div className="flex flex-col items-center mb-10">

              <div className="
              w-44
              h-44
              rounded-full
              bg-gradient-to-br
              from-yellow-300
              to-amber-500/10
              border
              border-yellow-400/20
              flex
              items-center
              justify-center
              shadow-2xl
              shadow-yellow-500/20
              mb-6
            ">
                <img
                    src={logo}
                    alt="Logo"
                    className="
                  w-36
                  object-contain
                  drop-shadow-2xl
                "
                />
              </div>

              <h1 className="
              text-4xl
              font-bold
              text-white
              tracking-wide
            ">
                Bienvenido
              </h1>

            {/*  <p className="*/}
            {/*  text-yellow-100/80*/}
            {/*  mt-3*/}
            {/*  text-sm*/}
            {/*">*/}
            {/*    Accede a tu plataforma empresarial*/}
            {/*  </p>*/}
            </div>

            {/* Form */}
            <form
                onSubmit={(e) => void onSubmit(e)}
                className="space-y-6"
            >

              {/* Email */}
              <div>
                <label className="
                block
                text-sm
                text-yellow-100
                mb-2
              ">
                  Correo electrónico
                </label>

                <div className="relative">

                  <Mail className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  w-5
                  h-5
                  text-yellow-400
                " />

                  <input
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="correo@empresa.com"
                      className="
                    w-full
                    bg-black/20
                    border
                    border-yellow-400/10
                    rounded-xl
                    py-3
                    pl-12
                    pr-4
                    text-white
                    placeholder:text-gray-500
                    outline-none
                    transition-all
                    focus:border-yellow-400
                    focus:ring-4
                    focus:ring-yellow-400/10
                  "
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="
                block
                text-sm
                text-yellow-100
                mb-2
              ">
                  Contraseña
                </label>

                <div className="relative">

                  <Lock className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  w-5
                  h-5
                  text-yellow-400
                " />

                  <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="
                    w-full
                    bg-black/20
                    border
                    border-yellow-400/10
                    rounded-xl
                    py-3
                    pl-12
                    pr-4
                    text-white
                    placeholder:text-gray-500
                    outline-none
                    transition-all
                    focus:border-yellow-400
                    focus:ring-4
                    focus:ring-yellow-400/10
                  "
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                  <div className="
                bg-red-500/10
                border
                border-red-500/20
                text-red-300
                rounded-xl
                p-3
                text-sm
              ">
                    {error}
                  </div>
              )}

              {/* Button */}
              <button
                  type="submit"
                  disabled={loading}
                  className="
                w-full
                py-3
                rounded-xl
                font-semibold
                text-black
                bg-gradient-to-r
                from-yellow-400
                to-amber-500
                hover:from-yellow-300
                hover:to-amber-400
                transition-all
                duration-300
                shadow-lg
                shadow-yellow-500/30
                hover:scale-[1.02]
                disabled:opacity-70
                flex
                items-center
                justify-center
                gap-2
              "
              >
                {loading && (
                    <Loader2 className="w-5 h-5 animate-spin" />
                )}

                {loading ? 'Entrando...' : 'Ingresar'}
              </button>
            </form>

            {/* Footer */}
            <div className="
            mt-8
            text-center
            text-xs
            text-yellow-200/50
          ">
              © 2026 All Center
            </div>
          </div>
        </div>
      </div>
  )
}