import { Statement } from '../Statement';
import { Declaration } from './Declaration';

interface ScopeOptions{
    parent?:Scope;
    paramNodes?:any[];
    block?:boolean;
    statement:Statement;
    isTopLevel?:boolean;
}

export class Scope{
    // 父作用域
    parent?:Scope;
    // 如果是函数作用域，则需要参数节点
    paramNodes:any[];
    // 是否为块级作用域
    isBlockscope?:boolean;
    // 作用域对应的语句节点
    statement:Statement;
    // 变量/函数 声明节点，为 Scope 的核心数据
    declarations:Record<string,Declaration> = {};
    constructor(options:ScopeOptions){
        const {parent,paramNodes,block,statement} = options;
        this.parent = parent;
        this.paramNodes = paramNodes || [];
        this.statement = statement;
        this.isBlockscope = !!block;
        this.paramNodes.forEach(node=>{
            (this.declarations[node.name] = new Declaration(node,true,this.statement))
        })
    }

    addDeclaration(node:any,isBlockDeclaration:boolean){
        // block scope & var 向上追溯，知道顶层作用域
        if(this.isBlockscope && !isBlockDeclaration && this.parent){
            this.parent.addDeclaration(node,isBlockDeclaration);
        }else{
            // 否则在当前作用域新建声明节点（Declaration）
            const key = node.id && node.id.name;

            this.declarations[key] = new Declaration(node,false,this.statement)
        }
    }

    // 遍历节点声明
    eachDeclaration(fn:(name:string,dec:Declaration)=>void){
        Object.keys(this.declarations).forEach(key=>{
            fn(key,this.declarations[key])
        })
    }

    contains(name:string):Declaration{
        return this.findDeclaration(name)
    }

    findDeclaration(name:string):Declaration{
        return (
            this.declarations[name] || (this.parent && this.parent.findDeclaration(name))
        )
    }
}