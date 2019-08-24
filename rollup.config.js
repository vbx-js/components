import compiler from '@ampproject/rollup-plugin-closure-compiler'
import commonjs from 'rollup-plugin-commonjs'
import modify from 'rollup-plugin-modify'
import nodeResolve from 'rollup-plugin-node-resolve'
import sourcemaps from 'rollup-plugin-sourcemaps'
import { terser } from 'rollup-plugin-terser'

const m = modify({
    find: /(\s|\\t|\\r|\\n)+/,
    replace: ' '
})
m._transform = m.transform
m.transform = undefined
m.renderChunk = function (code) {
    return m._transform(code)
}

const c6 = compiler({
    language_out: 'ECMASCRIPT6',
    rewrite_polyfills: false
})
c6._renderChunk = c6.renderChunk
c6.renderChunk = function (code, chunk, outputOptions) {
    if (outputOptions.file.endsWith('.es5.js'))
        return {
            code,
            map: null
        }
    return c6._renderChunk(code, chunk, outputOptions)
}

const c5 = compiler({
    language_out: 'ECMASCRIPT5',
    rewrite_polyfills: false
})
c5._renderChunk = c5.renderChunk
c5.renderChunk = function (code, chunk, outputOptions) {
    if (!outputOptions.file.endsWith('.es5.js'))
        return {
            code,
            map: null
        }
    return c5._renderChunk(code, chunk, outputOptions)
}

export default {
    input: 'src/index.js',
    output: [{
        file: 'dist/bundle.js',
        format: 'iife',
        name: 'Videobox',
        sourcemap: true
    }, {
        file: 'dist/bundle.es5.js',
        format: 'iife',
        name: 'Videobox',
        sourcemap: true
    }],
    plugins: [
        nodeResolve({
            mainFields: ['module', 'main']
        }),
        commonjs({
            extensions: ['.js', '.json']
        }),
        sourcemaps(),
        c5, c6,
        terser(),
        m,
    ]
}
