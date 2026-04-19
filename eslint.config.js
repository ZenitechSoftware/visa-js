import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: ["coverage/**", "node_modules/**"],
  },
  {
    plugins: {
      prettier: prettierPlugin.plugins.prettier,
    },
    rules: {
      ...prettierConfig.rules,
    },
  },
];
