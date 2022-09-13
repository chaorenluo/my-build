import { Bundle } from "./Bundle";
import { ModuleLoader } from "./ModuleLoader";
import MagicString from 'magic-string'
import { parse,Node, Statement as StatementNode } from "../../ast-parser/src/index";
import { Statement } from "./Statement";

import {
    Declaration,
    SyntheticDefaultDeclaration,
    SyntheticNamespaceDeclaration
  } from './ast/Declaration';




export interface ModuleOptions {
    path: string;
    bundle: Bundle;
    loader: ModuleLoader;
    code: string;
    isEntry: boolean;
  }
  
  interface ImportOrExportInfo {
    source?: string;
    localName: string;
    name: string;
    statement?: Statement;
    isDeclaration?: boolean;
    module?: Module;
  }
  
  interface Specifier {
    type: string;
    local: {
      name: string;
    };
    imported: {
      name: string;
    };
    exported: {
      name: string;
    };
  }
  
  type Imports = Record<string, ImportOrExportInfo>;
  type Exports = Record<string, ImportOrExportInfo>;


export class Module{
    isEntry:boolean = false;
    id:string;
    path:string;
    bundle:Bundle;
    moduleLoader:ModuleLoader;
    code:string;
    magicString:MagicString;
    statements:Statement[];
    // 文件导入对象
    imports:Imports;
    // 文件导出对象
    exports:Exports;
    // export { a, b } from 'mod' 导入一个文件把导入的文件又导出
    reexports:Exports;
    declarations: Record<string, Declaration>;
    // 
    exportAllSources: string[] = [];
    exportAllModules: Module[] = [];
    // 依赖的文件路径
    dependencies: string[] = [];
    // 引用了那些模块
    dependencyModules: Module[] = [];
    // 被哪些模块引用
    referencedModules: Module[] = [];
    constructor({path,bundle,code,loader,isEntry = false}:ModuleOptions){
        this.id=path;
        this.bundle = bundle;
        this.moduleLoader = loader;
        this.isEntry = isEntry;
        this.path = path;
        this.code = code;
        this.magicString = new MagicString(code);
        this.imports = {};
        this.exports = {};
        this.reexports = {};
        this.declarations = {};
        try {
            const ast = parse(code) as any;   
            const nodes = ast.body as StatementNode[];
            // 以语句Statement的维度来拆分Module,保存statement的集合，供之后分析
            this.statements = nodes.map((node) => {

                const magicString = this.magicString.snip(node.start, node.end);
           
                // Statement 对象将在后文中介绍具体实现
                return new Statement(node, magicString, this);
              });
        } catch (e) {
            console.log(e);
            throw e;
        }

         // 分析 AST 节点
        this.analyseAST();
    }
    analyseAST(){
        // 以语句为最小单位来分析
        this.statements.forEach((statement)=>{
            // 对statement进行分析
            statement.analyse();
            // 注册顶层申明
            if(!statement.scope.parent){
                statement.scope.eachDeclaration((name,declaration)=>{
                    this.declarations[name] = declaration;
                })
            }
        })
        // 注册statement的next属性，用于生成代码使用，next即下一个statement的起始位置
        const statements = this.statements;
        let next = this.code.length;
        for(let i = statements.length-1;i>=0;i--){
            statements[i].next = next;
            next = statements[i].start;
        }

        // 如果语句为import/export声明，那么给当前模块记录依赖的标识符
        this.statements.forEach((statement)=>{
            if(statement.isImportDeclaration){
                this.addImports(statement)
            }else if(statement.isExportDeclaration){
                this.addExports(statement)
            }
        })

    }
    // 处理 import 声明
    addImports(statement:Statement){
        const node = statement.node as any;
        const source = node.source.value;
        // import
        node.specifiers.forEach((specifier:Specifier)=>{
            // 为方便理解，本文只处理具名导入
            const localName = specifier.local.name;
          
            const name = specifier.imported.name; 
                               // import的文件路径source
                                // import的变量名 name localName
            this.imports[localName] = {source,name,localName}
        })
        this._addDependencySource(source);
    }
    // 处理 export 声明
    addExports(statement:Statement){
        const node = statement.node as any;
        const source = node.source && node.source.value;
        // 为方便立即，本文只处理具名导出
        if(node.type === 'ExportNamedDeclaration'){
            // export { a, b } from 'mod'
            if(node.specifiers.length){
               node.specifiers.forEach((specifier: Specifier) => {
                    const localName = specifier.local.name;
                    const exportedName = specifier.exported.name;
                    this.exports[exportedName] = {
                        localName,
                        name:exportedName
                    }
                    if(source){
                        this.reexports[localName] = {
                            statement,
                            source,
                            localName,
                            name:localName,
                            module:undefined
                        }
                        this.imports[localName] = {
                            source, 
                            localName,
                            name:localName
                        }
                        this._addDependencySource(source);
                    }
               });
            }else{
                const declaration = node.declaration;
                let name;
                if(declaration.type === 'VariableDeclaration'){
                      // export const foo = 2;
                      name = declaration.declarations[0].id.name;
                }else{
                     // export function foo() {}
                     name = declaration.id.name;
                }
                this.exports[name] = {
                    statement,
                    localName:name,
                    name
                }
            }
        }else if(node.type === 'ExportAllDeclaration'){
             // export * from 'mod'
            if(source){
                this.exportAllModules.push(source);
                this._addDependencySource(source)
            }
        }
    }

    private _addDependencySource(source:string){
        if(!this.dependencies.includes(source)){
            this.dependencies.push(source)
        }

    }

    bind(){
        // 记录标识符对应的模块对象
        this.bindDependencies();
        // 除此之外，根据之前记录的 Reference 节点绑定对应的 Declaration 节点
        this.bindReferences();
    }

    bindDependencies(){
        [...Object.values(this.imports),...Object.values(this.reexports)].forEach((specifier)=>{
            specifier.module = this._getModuleBySource(specifier.source!);
        })
         // export * from 'mod'
        this.exportAllModules = this.exportAllSources.map(this._getModuleBySource.bind(this))
        // 建立模块依赖图
        this.dependencyModules = this.dependencies.map(this._getModuleBySource.bind(this))
        // 建立双向链表
        this.dependencyModules.forEach((module)=>{
            module.referencedModules.push(this)
        })
    }

    bindReferences(){
        this.statements.forEach((statement)=>{
            statement.references.forEach((reference)=>{
                 // 根据引用寻找声明的位置
                 // 寻找顺序: 1. statement 2. 当前模块 3. 依赖模块
                 const declaration = reference.scope.findDeclaration(reference.name) ||
                 this.trace(reference.name)
                 if(declaration){
                    declaration.addReference(reference)
                 }
            })
        })
    }

    // 拿到模块所有导出
    getExports():string[]{
        return [
            ...Object.keys(this.exports),
            ...Object.keys(this.reexports),
            ...this.exportAllModules
            .map(module=>module.getExports())
            .flat()
        ]
    }

    // 从导出名追溯到 Declaration 声明节点
    traceExport(name:string):Declaration | null {
        // 1. reexport
        // export { foo as bar } from './mod'
        const reexportDeclaration = this.reexports[name];
        if(reexportDeclaration){
            // 说明是从其它模块 reexport 出来的
            // 经过 bindDependencies 方法处理，现已绑定 module
            const declaration  = reexportDeclaration.module!.traceExport(
                reexportDeclaration.localName
            )
            if(!declaration){
                throw new Error(
                    `${reexportDeclaration.localName} is not exported by module ${
                      reexportDeclaration.module!.path
                    }(imported by ${this.path})`);
            }
            return  declaration ;
        }
         // 2. export
        // export { foo }
        const exportDeclaration = this.exports[name];
        if(exportDeclaration){
            const declaration = this.trace(name);
            if(declaration){
                return declaration
            }
        }
        // 3. export all
        for(let exportAllModule  of this.exportAllModules){
            const declaration = exportAllModule.trace(name)
            if(declaration){
                return declaration
            }
        }
        return null;
    }

    trace(name:string){
        if(this.declarations[name]){
            // 从当前模块找
            return this.declarations[name]
        }
        // 从依赖模块找
        if(this.imports[name]){
            const importSpecifier = this.imports[name];
            const importModule = importSpecifier.module;
            const declaration = importModule?.traceExport(importSpecifier.name)
            if(declaration){
                return declaration
            }
        }
        return null;
    }

    render() {
        const source = this.magicString.clone().trim();
        this.statements.forEach((statement) => {
          // 1. Tree Shaking
          if (!statement.isIncluded) {
            source.remove(statement.start, statement.next);
            return;
          }
          // 2. 重写引用位置的变量名 -> 对应的声明位置的变量名
          statement.references.forEach((reference) => {
            const { start, end } = reference;
            const declaration = reference.declaration;
            if (declaration) {
              const name = declaration.render();
              source.overwrite(start, end, name!);
            }
          });
          // 3. 擦除/重写 export 相关的代码
          if (statement.isExportDeclaration && !this.isEntry) {
            // export { foo, bar }
            if (
              statement.node.type === 'ExportNamedDeclaration' &&
              statement.node.specifiers.length
            ) {
              source.remove(statement.start, statement.next);
            }
            // remove `export` from `export const foo = 42`
            else if (
              statement.node.type === 'ExportNamedDeclaration' &&
              (statement.node.declaration!.type === 'VariableDeclaration' ||
                statement.node.declaration!.type === 'FunctionDeclaration')
            ) {
              source.remove(
                statement.node.start,
                statement.node.declaration!.start
              );
            }
            // remove `export * from './mod'`
            else if (statement.node.type === 'ExportAllDeclaration') {
              source.remove(statement.start, statement.next);
            }
          }
        });
        return source.trim();
      }

    private _getModuleBySource(source:string){
        const id = this.moduleLoader.resolveId(source!,this.path) as string;
        return this.bundle.getModuleById(id)
    }
}