import globals from "globals";
import pluginJs from "@eslint/js";
import mochaPlugin from 'eslint-plugin-mocha';

export default [
    {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
    {languageOptions: {globals: globals.browser}},
    pluginJs.configs.recommended,
    mochaPlugin.configs.flat.recommended
];