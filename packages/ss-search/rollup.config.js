import typescript from "rollup-plugin-typescript2"
import commonjs from "rollup-plugin-commonjs"
import resolve from "rollup-plugin-node-resolve"
import pkg from "./package.json"
import { terser } from "rollup-plugin-terser"

commonjs({
    exclude: ["node_modules/lodash/**"],
})

const isProduction = !process.env.ROLLUP_WATCH

export default {
    input: "src/index.ts",
    output: {
        name: "ss-search",
        file: pkg.main,
        format: "cjs",
    },
    plugins: [
        typescript({  }),
        resolve(),
        commonjs({ extensions: [".js", ".ts"] }),
        isProduction && terser(),
    ],
    external: [...Object.keys(pkg.dependencies || {})],
}
