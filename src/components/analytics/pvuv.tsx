// PVUV.ai visitor counter — a fixed third-party snippet rendered as a native
// <script> so it lands in the SSR HTML. `defer` keeps it off the critical path.
export function Pvuv() {
  return (
    <script
      id="pvuv-loader"
      defer
      src="https://www.pvuv.ai/f.js"
      data-site="raUs6aRJ"
      data-api="https://in.pvuv.ai"
    />
  );
}
