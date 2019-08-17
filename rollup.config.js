import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import { terser } from "rollup-plugin-terser"
import compiler from '@ampproject/rollup-plugin-closure-compiler';

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/bundle.js',
        format: 'iife',
        name: 'Videobox',
        sourcemap: true
    },
    plugins: [
        nodeResolve({
            mainFields: ['module', 'main']
        }),
        commonjs({
            extensions: ['.js', '.json']
        }),
        compiler({
            language_out: 'ECMASCRIPT_2017',
            rewrite_polyfills: false
        }),
        terser()
    ]
}
