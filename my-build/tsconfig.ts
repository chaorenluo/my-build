{
    "compilerOptions": {
      "target": "es2016",
      "allowJs": true,
      "module": "commonjs",
      "moduleResolution": "node",
      "outDir": "dist",
      "esModuleInterop": true,
      "forceConsistentCasingInFileNames": true,
      "strict": true,
      "skipLibCheck": true,
      "sourceMap": true,
      "baseUrl": "src",
      "rootDir": "src",
      "declaration": true,
      "plugins": [
        {
          "transform": "typescript-transform-paths"/* 支持别名 */ 
        },
        {
          "transform": "typescript-transform-paths",
          "afterDeclarations": true/* 支持类型文件中的别名 */ 
        }
      ],
      "paths": {
        "*": ["./*"],
        "ast-parser": ["../../ast-parser"]/* AST 解析器的路径*/
      }
    },
    "include": ["src"],
    "references": [{ "path": "../ast-parser" }]
  }