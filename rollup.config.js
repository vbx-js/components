import compiler from '@ampproject/rollup-plugin-closure-compiler'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import sourcemaps from 'rollup-plugin-sourcemaps'
import { terser } from "rollup-plugin-terser"

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/bundle.js',
        format: 'iife',
        name: 'Videobox',
        sourcemap: false
    },
    plugins: [
        nodeResolve({
            mainFields: ['module', 'main']
        }),
        commonjs({
            extensions: ['.js', '.json']
        }),
        sourcemaps(),
        compiler({
            language_out: 'ECMASCRIPT6',
            rewrite_polyfills: false
        }),
        terser()
    ]
}
