import { Module } from '../Module';
import { Statement } from '../Statement';
import { Reference } from './Reference';

export class Declaration{
    isFunctionDeclaration: boolean = false;
    functionNode:any;
    statement:Statement | null;
    name:string | null = null;
    isParam:boolean = false;
    isUsed:boolean = false;
    isReassigned:boolean = false;
    constructor(node:any,isParam:boolean,statement:Statement|null){
        // 考虑函数和变量申明的2种情况
        if(node){
            if(node.type === 'FunctionDeclaration'){
                this.isFunctionDeclaration = true;
                this.functionNode = node;
            }else if(
                node.type === 'VariableDeclarator' &&
                node.init &&
                /FunctionExpression/.test(node.init.type)
            ){
                this.isFunctionDeclaration = true;
                this.functionNode = node.init
            }
        }
        this.statement = statement;
        this.isParam = isParam;
    }

    addReference(reference:Reference){
        reference.declaration = this;
        this.name = reference.name;
    }

    use(){
        // 标记该节点被使用
        this.isUsed = true;
        // 对应的statement节点也应该被标记
        if(this.statement){
            this.statement.mark(this.name)
        }
    }

    // 另外，你可以加上 render 方法，便于后续代码生成的步骤
    render(){
        return this.name
    }
}