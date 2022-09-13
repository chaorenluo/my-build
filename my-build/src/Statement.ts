// src/Statement.ts
// 以下为三个工具函数

import MagicString from "magic-string";
import {Module} from "./Module";
import { Declaration } from "../../ast-parser/src";
import {NodeType,ExportAllDeclaration,FunctionDeclaration} from '../../ast-parser/src/node-types'
import { Reference } from "./ast/Reference";
import {findReference} from './utils/findReference'
import {buildScope} from './utils/buildScope'
import { Statement as StatementNode, ExportDeclaration, ExportNamedDeclaration } from '../../ast-parser/src';
import {Scope} from './ast/Scope'
// 是否为函数节点
function isFunctionDeclaration(node:Declaration):boolean{
    if(!node) return false;
    return(
        node.type === 'FunctionDeclaration' ||
        (node.type === NodeType.VariableDeclarator  && node.init && node.init.type === NodeType.FunctionExpression) ||
        // export function ...
        // export default function
        ((node.type === NodeType.ExportNamedDeclaration || node.type === NodeType.ExportDefaultDeclaration)  &&
            !!node.declaration &&
            node.declaration.type === NodeType.FunctionDeclaration
        )
    );
}
// 是否为 export 声明节点
export function isExportDeclaration(node:any):boolean{
    return /^Export/.test(node.type);
}
// 是否为 import 声明节点
export function isImportDeclaration(node:any){
    return node.type === 'ImportDeclaration'
}

export class Statement{
    node:StatementNode;
    magicString:MagicString;
    module:Module;
    scope:Scope;
    start:number;
    next:number;
    isImportDeclaration:boolean;
    isExportDeclaration:boolean;
    isReexportDeclaration:boolean;
    isFunctionDeclaration:boolean;
    isIncluded:boolean = false;
    defines:Set<string> = new Set();
    modifies:Set<string> = new Set();
    dependsOn:Set<string> = new Set();
    // 引用依赖的节点集合
    references:Reference[] = [];
    constructor(node:StatementNode,magicString:MagicString,module:Module){
        this.magicString = magicString;
        this.node = node;
        this.module = module;
        this.scope = new Scope({
            statement:this
        });
        this.start = node.start;
        this.next = 0;
        this.isImportDeclaration = isImportDeclaration(node); //判读这句代码是否为导入语句
        this.isExportDeclaration = isExportDeclaration(node); //判读这句代码是否为导出语句
        // 是否为导入在导出语句
        this.isReexportDeclaration = this.isExportDeclaration && !!(node as ExportAllDeclaration).source;
        // 是否为函数节点
        this.isFunctionDeclaration = isFunctionDeclaration(node as FunctionDeclaration)
    }

    analyse(){
        if(this.isImportDeclaration) return;
        // 1.构建作用域链，记录Declaration 节点表
        buildScope(this);
        // 2.寻找引用的依赖节点，记录Reference 节点表
        findReference(this)
    }

    mark(name){
        if(this.isIncluded){
            return
        }
        this.isIncluded = true;
        this.references.forEach((ref:Reference)=>ref.declaration && ref.declaration.use())
    }
}


