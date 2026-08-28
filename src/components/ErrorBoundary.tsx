import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 画面渲染出错时的最后一道防线。
 *
 * 没有这个的话,React 一抛错就把整棵树卸载掉,画面变全白 ——
 * 在仓库的扫码机上没有 devtools,白屏等于完全查不出原因。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-dvh bg-slate-100 p-5">
        <div className="mx-auto max-w-lg rounded-2xl border-2 border-rose-300 bg-white p-5">
          <h1 className="text-[18px] font-bold text-rose-700">画面出错 Something broke</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            还没同步的盘点资料还留在这台机器里,没有丢。
            <br />
            Unsynced counts are still stored on this device.
          </p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[12px] break-all whitespace-pre-wrap text-rose-800">
            {error.message}
            {'\n\n'}
            {String(__BUILD_ID__)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 min-h-[52px] w-full rounded-xl bg-slate-900 text-[16px] font-semibold text-white"
          >
            再试一次 Try again
          </button>
          <button
            onClick={() => location.reload()}
            className="mt-2 min-h-[52px] w-full rounded-xl bg-slate-200 text-[16px] font-semibold text-slate-700"
          >
            重新载入 Reload
          </button>
        </div>
      </div>
    )
  }
}
